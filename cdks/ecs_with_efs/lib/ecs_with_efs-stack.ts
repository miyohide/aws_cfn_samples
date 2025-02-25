import { Peer, Port, SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Cluster, ContainerDefinition, ContainerImage, CpuArchitecture, FargateTaskDefinition, LogDrivers, OperatingSystemFamily } from 'aws-cdk-lib/aws-ecs';
import { ApplicationLoadBalancedFargateService } from 'aws-cdk-lib/aws-ecs-patterns';
import { FileSystem, LifecyclePolicy, PerformanceMode, ThroughputMode } from 'aws-cdk-lib/aws-efs';
import { ApplicationLoadBalancer, ApplicationProtocol, ApplicationTargetGroup, Protocol, TargetType } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { AnyPrincipal, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib/core';
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

    const albFargateService = new ApplicationLoadBalancedFargateService(this, 'MyALBService', {
      cluster: ecsCluster,
      taskDefinition: taskDef,
      desiredCount: 2
    });

    // ヘルスチェックの設定
    albFargateService.targetGroup.configureHealthCheck({
      path: "/up",
      port: "3000",
      protocol: Protocol.HTTP,
      interval: Duration.seconds(15),
      timeout: Duration.seconds(10),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 2,
    });

    albFargateService.targetGroup.setAttribute('deregistration_delay.timeout_seconds', '30');

    fileSystem.grantRootAccess(albFargateService.taskDefinition.taskRole.grantPrincipal);
    fileSystem.connections.allowDefaultPortFrom(albFargateService.service.connections);
  }
}
