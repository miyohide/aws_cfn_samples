import * as cdk from 'aws-cdk-lib';
import { Repository } from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';
import { MyVpc } from './construct/my-vpc';
import { MySecurityGroup } from './construct/my-security-group';
import { Alb } from './construct/alb';
import { Rds } from './construct/rds';
import { Ecs } from './construct/ecs';
import { ApplicationProtocol } from 'aws-cdk-lib/aws-elasticloadbalancingv2';

export class EcsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps, readonly resourceName = "sample-ecr-app") {
    super(scope, id, props);

    const ecrName = this.node.tryGetContext("ecrName");

    // ECRを名前から取得する
    const ecr = Repository.fromRepositoryName(this, "EcrRepository", ecrName);

    // VPCを作成する
    const myVpc = new MyVpc(this, "VPC", resourceName);

    // Security Groupを作成する
    const {albSecurityGroup, ecsSecurityGroup, rdsSecurityGroup} = new MySecurityGroup(this, "SecurityGroup", {
      vpc: myVpc.value,
      resourceName,
    });

    // ALBを作成する
    const alb = new Alb(this, "Alb", {
      vpc: myVpc.value,
      resourceName,
      securityGroup: albSecurityGroup,
      subnets: myVpc.getPublicSubnets(),
    });

    // RDSを作成する
    const rds = new Rds(this, "Rds", {
      resourceName,
      vpc: myVpc.value,
      securityGroup: rdsSecurityGroup,
      subnets: myVpc.getRdsSubnets(),
    });

    const railsMasterKey = this.node.tryGetContext("railsMasterKey");

    // ECS
    const ecs = new Ecs(this, "EcsFargate", {
      vpc: myVpc.value,
      resourceName,
      ecrRepository: ecr,
      securityGroup: ecsSecurityGroup,
      subnets: myVpc.getEcsSubnets(),
      rdsInstance: rds.rdsPrimaryInstance,
      railsMasterKey: railsMasterKey,
    });

    // ターゲットグループにECSを追加
    alb.addTargets("Ecs", {
      port: 3000,
      protocol: ApplicationProtocol.HTTP,
      targets: [ecs.fargateService],
      healthCheck: {
        path: "/up",
        interval: cdk.Duration.minutes(1),
      },
    });
  }
}
