import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Repository } from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import { Construct } from 'constructs';

export class SimpleEcsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const resourceName = "my-ecs-project"

    // ECRを名前から取得する
    const ecr = Repository.fromRepositoryName(this, "ECRRepository", `${resourceName}-ecr-repo`)

    // VPCとサブネットを作成する。
    // AZは2、サブネットはパブリックサブネット
    const vpc = new cdk.aws_ec2.Vpc(this, 'VPC', {
      vpcName: `${resourceName}-vpc`,
      maxAzs: 2,
      ipAddresses: ec2.IpAddresses.cidr("10.0.0.0/16"),
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: `${resourceName}-public-subnet`,
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    // ECS Clusterを作成する
    const cluster = new ecs.Cluster(this, 'Cluster', {
      clusterName: `${resourceName}-cluster`,
      vpc: vpc,
    });

    // ALBとECS Fargate Serviceを作成する
    const fargateService = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'FargateService', {
      serviceName: `${resourceName}-service`,
      cluster: cluster,
      cpu: 512,
      memoryLimitMiB: 1024,
      desiredCount: 1,
      loadBalancerName: `${resourceName}-alb`,
      publicLoadBalancer: true,
      assignPublicIp: true,
      taskSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      taskImageOptions: {
        image: ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample"),
      },
    });
  }
}
