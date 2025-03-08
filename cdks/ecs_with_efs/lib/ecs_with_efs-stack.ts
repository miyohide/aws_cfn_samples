import { Peer, Port, SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Cluster, ContainerDefinition, ContainerImage, CpuArchitecture, FargateService, FargateTaskDefinition, LogDrivers, OperatingSystemFamily } from 'aws-cdk-lib/aws-ecs';
import { AccessPoint, FileSystem, LifecyclePolicy, PerformanceMode, ThroughputMode } from 'aws-cdk-lib/aws-efs';
import { ApplicationLoadBalancer, ApplicationProtocol, ApplicationTargetGroup, Protocol, TargetType } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { AnyPrincipal, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib/core';
import { Construct } from 'constructs';

export class EcsWithEfsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const resourceName = "MyRailsApp";

    const vpc = new Vpc(this, 'MyVPC', {
      maxAzs: 2,
      natGateways: 1
    });
    const ecsCluster = new Cluster(this, 'EcsCluster', { vpc: vpc });

    // セキュリティグループを作成する
    // ALB向けセキュリティグループ
    const securityGroupForALB = new SecurityGroup(this, 'SecurityGroupForALB', {
      securityGroupName: `${resourceName}-security-group-for-ALB`,
      vpc: vpc,
      description: "Allow HTTP(S) inbound traffic. Allow all outbound traffic.",
      allowAllOutbound: true
    });
    securityGroupForALB.addIngressRule(Peer.anyIpv4(), Port.HTTP, "Allow HTTP inbound traffic");
    securityGroupForALB.addIngressRule(Peer.anyIpv4(), Port.HTTPS, "Allow HTTPS inbound traffic");

    // ECS向けセキュリティグループ
    const securityGroupForECS = new SecurityGroup(this, 'SecurityGroupForECS', {
      securityGroupName: `${resourceName}-security-group-for-ECS`,
      vpc: vpc,
      description: "Allow Rails app inbound traffic. Allow all outbound traffic.",
      allowAllOutbound: true
    });
    securityGroupForECS.addIngressRule(securityGroupForALB, Port.tcp(3000), "Allow Rails app inbound traffic");

    // EFSを作成する
    const fileSystem = new FileSystem(this, 'MyEfsFileSystem', {
      vpc: vpc,
      encrypted: true,
      removalPolicy: RemovalPolicy.DESTROY,
      lifecyclePolicy: LifecyclePolicy.AFTER_14_DAYS,
      performanceMode: PerformanceMode.GENERAL_PURPOSE,
      throughputMode: ThroughputMode.BURSTING
    });

    // EFSのパブリックアクセスは禁止
    fileSystem.addToResourcePolicy(
      new PolicyStatement({
        actions: ['elasticfilesystem:ClientMount'],
        principals: [new AnyPrincipal()],
        conditions: {
          Bool: {
            'elasticfilesystem:AccessedViaMountTarget': 'true'
          }
        }
      })
    );

    // アクセスポイントの作成
    const accessPoint = new AccessPoint(this, 'EFSAccessPoint', {
      fileSystem: fileSystem,
      path: '/mnt/efs',
      posixUser: {
        uid: '1000',
        gid: '1000'
      },
      createAcl: {
        ownerGid: '1000',
        ownerUid: '1000',
        permissions: '755'
      },
    })

    const taskDef = new FargateTaskDefinition(this, "MyTaskDef", {
      memoryLimitMiB: 512,
      cpu: 256,
      runtimePlatform: {
        operatingSystemFamily: OperatingSystemFamily.LINUX,
        cpuArchitecture: CpuArchitecture.ARM64
      },
      volumes: [
        {
          name: "dbfile",
          efsVolumeConfiguration: {
            fileSystemId: fileSystem.fileSystemId,
            authorizationConfig: {
              accessPointId: accessPoint.accessPointId,
              iam: "ENABLED"
            },
            transitEncryption: "ENABLED"
          }
        }
      ]
    });

    const containerDef = new ContainerDefinition(this, 'MyContainerDefinition', {
      image: ContainerImage.fromRegistry('coderaiser/cloudcmd'),
      logging: LogDrivers.awsLogs({ streamPrefix: 'myrailsecs', logRetention: RetentionDays.ONE_DAY }),
      taskDefinition: taskDef,
      environment: {
        RAILS_ENV: "production",
        RAILS_LOG_TO_STDOUT: "1",
        RAILS_SERVE_STATIC_FILES: "1",
        RAILS_MASTER_KEY: this.node.tryGetContext("RAILS_MASTER_KEY")
      }
    });

    containerDef.addMountPoints(
      {
        containerPath: '/mnt/efs',
        sourceVolume: 'dbfile',
        readOnly: false
      }
    );

    containerDef.addPortMappings({
      containerPort: 3000,
    });

    // Fargate Serviceを作成する
    const fargateService = new FargateService(this, 'MyFargateService', {
      cluster: ecsCluster,
      taskDefinition: taskDef,
      desiredCount: 2,
      securityGroups: [securityGroupForECS],
      vpcSubnets: {
        subnets: vpc.privateSubnets
      }
    });

    // ターゲットグループを作成する
    const targetGroup = new ApplicationTargetGroup(this, "ALBTargetGroup", {
      targetGroupName: `${resourceName}-target-group`,
      vpc: vpc,
      port: 3000,
      protocol: ApplicationProtocol.HTTP,
      healthCheck: {
        path: "/up",
        port: "3000",
        protocol: Protocol.HTTP
      },
      targetType: TargetType.IP
    });

    // ALBの作成
    const alb = new ApplicationLoadBalancer(this, 'MyALB', {
      vpc: vpc,
      internetFacing: true,
      securityGroup: securityGroupForALB,
      vpcSubnets: {
        subnets: vpc.publicSubnets
      }
    });

    // リスナーの作成
    const listener = alb.addListener("MyALBListener", {
      protocol: ApplicationProtocol.HTTP,
      defaultTargetGroups: [targetGroup]
    });

    // ターゲットグループにECSを追加
    listener.addTargets("ECSTarget", {
      port: 3000,
      protocol: ApplicationProtocol.HTTP,
      targets: [fargateService],
      healthCheck: {
        path: "/up",
        interval: Duration.seconds(30)
      }
    });

    fileSystem.grantRootAccess(fargateService.taskDefinition.taskRole.grantPrincipal);
    fileSystem.connections.allowDefaultPortFrom(fargateService.connections);
  }
}
