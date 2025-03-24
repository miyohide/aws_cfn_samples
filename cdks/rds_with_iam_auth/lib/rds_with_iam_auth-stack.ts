import * as cdk from 'aws-cdk-lib';
import { SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class RdsWithIamAuthStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPCを作成する
    const vpc = new Vpc(this, 'Vpc', {
      vpcName: 'MyVPC',
      natGateways: 0,
      maxAzs: 2,
      subnetConfiguration: [
        {
          // EC2用
          cidrMask: 24,
          name: 'ec2',
          subnetType: SubnetType.PRIVATE_WITH_EGRESS
        },
        {
          // RDS用
          cidrMask: 24,
          name: 'rds',
          subnetType: SubnetType.PRIVATE_ISOLATED
        }
      ]
    });
  }
}
