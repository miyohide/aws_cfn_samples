import * as cdk from 'aws-cdk-lib';
import { Repository } from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';
import { MyVpc } from './construct/my-vpc';
import { MySecurityGroup } from './construct/my-security-group';
import { Alb } from './construct/alb';

export class EcsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps, readonly resourceName = "sample-ecr-app") {
    super(scope, id, props);

    // ECRを作成する
    const ecr = new Repository(this, "EcrRepository", {
      repositoryName: `${resourceName}-ecr`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: true,
    });

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
  }
}
