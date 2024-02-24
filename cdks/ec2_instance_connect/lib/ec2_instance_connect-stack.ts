import * as cdk from 'aws-cdk-lib';
import { CfnInstanceConnectEndpoint, Instance, InstanceClass, InstanceSize, InstanceType, MachineImage, Port, SecurityGroup, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class Ec2InstanceConnectStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPCを作成する
    const vpc = new Vpc(this, 'VPC', {
      maxAzs: 1,
      subnetConfiguration: [
        {
          name: 'private',
          subnetType: SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    // SecurityGroupを作成する
    const securityGroupForEC2 = new SecurityGroup(this, 'SecurityGroupForEC2', {
      vpc,
    });
    const securityGroupForEIC = new SecurityGroup(this, 'SecurityGroupForEIC', {
      vpc,
      allowAllOutbound: false, // 指定のEC2のみに通信を許可するためfalseを指定
    });
    securityGroupForEC2.addIngressRule(securityGroupForEIC, Port.tcp(22));
    securityGroupForEIC.addIngressRule(securityGroupForEC2, Port.tcp(22));

    // EC2インスタンスを作成する
    new Instance(this, 'EC2', {
      vpc,
      instanceType: InstanceType.of(InstanceClass.T2, InstanceSize.MICRO),
      machineImage: MachineImage.latestAmazonLinux2023(),
      securityGroup: securityGroupForEC2,
    });

    // EC2 Instance Connectを作成する
    new CfnInstanceConnectEndpoint(this, 'InstanceConnect', {
      subnetId: vpc.selectSubnets({ subnetType: SubnetType.PRIVATE_ISOLATED }).subnetIds[0],
      securityGroupIds: [securityGroupForEIC.securityGroupId],
    });
  }
}
