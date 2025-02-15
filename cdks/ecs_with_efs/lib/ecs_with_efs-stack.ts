import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { Cluster, ContainerDefinition, ContainerImage, FargateTaskDefinition } from 'aws-cdk-lib/aws-ecs';
import { ApplicationLoadBalancedFargateService } from 'aws-cdk-lib/aws-ecs-patterns';
import { FileSystem, LifecyclePolicy, PerformanceMode, ThroughputMode } from 'aws-cdk-lib/aws-efs';
import { AnyPrincipal, PolicyStatement } from 'aws-cdk-lib/aws-iam';
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
      taskDefinition: taskDef
    });

    containerDef.addMountPoints(
      {
        containerPath: '/uploads',
        sourceVolume: 'uploads',
        readOnly: false
      }
    );

    containerDef.addPortMappings({
      containerPort: 8000,
    });

    const albFargateService = new ApplicationLoadBalancedFargateService(this, 'MyALBService', {
      cluster: ecsCluster,
      taskDefinition: taskDef,
      desiredCount: 2
    });

    albFargateService.targetGroup.setAttribute('deregistration_delay.timeout_seconds', '30');

    fileSystem.grantRootAccess(albFargateService.taskDefinition.taskRole.grantPrincipal);
    fileSystem.connections.allowDefaultPortFrom(albFargateService.service.connections);
  }
}
