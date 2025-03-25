import * as cdk from 'aws-cdk-lib';
import { Instance, InstanceClass, InstanceSize, InstanceType, MachineImage, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
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
          subnetType: SubnetType.PRIVATE_ISOLATED
        },
        {
          // RDS用
          cidrMask: 24,
          name: 'rds',
          subnetType: SubnetType.PRIVATE_ISOLATED
        }
      ]
    });

    const ec2Subnet = vpc.selectSubnets({
      subnetGroupName: 'ec2'
    });

    // EC2インスタンスを作成する
    const ec2 = new Instance(this, "MyEC2", {
      instanceType: InstanceType.of(
        InstanceClass.T3, InstanceSize.MICRO
      ),
      machineImage: MachineImage.latestAmazonLinux2023(),
      vpc: vpc,
      vpcSubnets: ec2Subnet,
    })
  }
}
