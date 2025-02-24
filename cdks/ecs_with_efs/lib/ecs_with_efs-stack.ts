import { Peer, Port, SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Cluster, ContainerDefinition, ContainerImage, CpuArchitecture, FargateTaskDefinition, LogDrivers, OperatingSystemFamily } from 'aws-cdk-lib/aws-ecs';
import { ApplicationLoadBalancedFargateService } from 'aws-cdk-lib/aws-ecs-patterns';
import { FileSystem, LifecyclePolicy, PerformanceMode, ThroughputMode } from 'aws-cdk-lib/aws-efs';
import { ApplicationLoadBalancer, ApplicationProtocol, ApplicationTargetGroup, Protocol, TargetType } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { AnyPrincipal, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib/core';
import { Construct } from 'constructs';

export class EcsWithEfsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = new Vpc(this, 'MyVPC', { maxAzs: 2});
    const ecsCluster = new Cluster(this, 'EcsCluster', { vpc: vpc });

    const fileSystem = new FileSystem(this, 'MyEfsFileSystem', {
      vpc: vpc,
      encrypted: true,
      removalPolicy: RemovalPolicy.DESTROY,
      lifecyclePolicy: LifecyclePolicy.AFTER_14_DAYS,
      performanceMode: PerformanceMode.GENERAL_PURPOSE,
      throughputMode: ThroughputMode.BURSTING
    });

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

    const taskDef = new FargateTaskDefinition(this, "MyTaskDef", {
      memoryLimitMiB: 512,
      cpu: 256,
      runtimePlatform: {
        operatingSystemFamily: OperatingSystemFamily.LINUX,
        cpuArchitecture: CpuArchitecture.ARM64
      },
      volumes: [
        {
          name: "uploads",
          efsVolumeConfiguration: {
            fileSystemId: fileSystem.fileSystemId,
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
        RALS_MASTER_KEY: this.node.tryGetContext("RAILS_MASTER_KEY")
      }
    });

    containerDef.addMountPoints(
      {
        containerPath: '/uploads',
        sourceVolume: 'uploads',
        readOnly: false
      }
    );

    containerDef.addPortMappings({
      containerPort: 3000,
    });

    // ターゲットグループの作成
    const targetGroup = new ApplicationTargetGroup(this, "ALBTargetGroup", {
      targetGroupName: "MyALBTargetGroupName",
      vpc: vpc,
      targetType: TargetType.IP,
      protocol: ApplicationProtocol.HTTP,
      port: 3000,
      healthCheck: {
        path: "/",
        port: "3000",
        protocol: Protocol.HTTP,
      },
    });

    // ALB向けのセキュリティグループを設定
    const securityGroupForALB = new SecurityGroup(this, "ALBSecurityGroup", {
      securityGroupName: "MyALBSecurityGroup",
      description: "ALB Security Group",
      vpc: vpc,
      allowAllOutbound: true,
    });
    securityGroupForALB.addIngressRule(Peer.anyIpv4(), Port.HTTP, "Allow HTTP inboud");
    securityGroupForALB.addIngressRule(Peer.anyIpv4(), Port.HTTPS, "Allow TCP HTTPS inboud")

    // ALBを作成
    const alb = new ApplicationLoadBalancer(this, 'MyALB', {
      internetFacing: true,
      vpc: vpc,
      loadBalancerName: 'MyALB',
      securityGroup: securityGroupForALB,
    });

    alb.addListener("AlbListener", {
      protocol: ApplicationProtocol.HTTP,
      defaultTargetGroups: [targetGroup],
    });

    const albFargateService = new ApplicationLoadBalancedFargateService(this, 'MyALBService', {
      cluster: ecsCluster,
      taskDefinition: taskDef,
      desiredCount: 2,
      loadBalancer: alb,
    });

    albFargateService.targetGroup.setAttribute('deregistration_delay.timeout_seconds', '30');


    fileSystem.grantRootAccess(albFargateService.taskDefinition.taskRole.grantPrincipal);
    fileSystem.connections.allowDefaultPortFrom(albFargateService.service.connections);
  }
}
