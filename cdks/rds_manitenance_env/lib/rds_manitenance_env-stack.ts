import * as cdk from 'aws-cdk-lib';
import { CfnInstanceConnectEndpoint, Port, SecurityGroup, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class MyrdstestStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPCとnatGateway用のPublic Subnet、EC2用のPrivate Subnetと
    // DB用のPrivate Subnetを作成する
    const vpc = new Vpc(this, 'VPC', {
      cidr: '10.0.0.0/16',
      vpcName: 'MyRDSTestVPC',
      natGateways: 1,
      maxAzs: 2,
      subnetConfiguration: [
        {
          // natGateway用のpublic subnet
          cidrMask: 24,
          name: 'public',
          subnetType: SubnetType.PUBLIC
        },
        {
          // EC2用のprivate subnet
          cidrMask: 24,
          name: 'forEC2',
          subnetType: SubnetType.PRIVATE_WITH_EGRESS
        },
        {
          // DB用のprivate subnet
          cidrMask: 24,
          name: 'forRDS',
          subnetType: SubnetType.PRIVATE_ISOLATED
        }
      ]
    });

    // EC2用のセキュリティグループ
    const ec2Sg = new SecurityGroup(this, 'ec2Sg', {
      vpc: vpc,
    });
    // EIC用のセキュリティグループ
    const eicSg = new SecurityGroup(this, 'eicSg', {
      vpc: vpc,
      allowAllOutbound: false
    });
    ec2Sg.addIngressRule(eicSg, Port.tcp(22));
    eicSg.addEgressRule(ec2Sg, Port.tcp(22));

    // EC2 Instance Connectを作成する
    new CfnInstanceConnectEndpoint(this, 'InstanceConnectEndpoint', {
      subnetId: vpc.selectSubnets({ subnetType: SubnetType.PRIVATE_WITH_EGRESS }).subnetIds[0],
      securityGroupIds: [eicSg.securityGroupId]
    });
  }
}
