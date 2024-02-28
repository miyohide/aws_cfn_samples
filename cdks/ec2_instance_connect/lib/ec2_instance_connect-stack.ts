import { Stack, StackProps } from 'aws-cdk-lib';
import { CfnInstanceConnectEndpoint, Instance, InstanceClass, InstanceSize, InstanceType, MachineImage, Port, SecurityGroup, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { readFileSync } from 'fs';

export class Ec2InstanceConnectStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // VPCを作成する
    const vpc = new Vpc(this, 'VPC', {
      vpcName: 'EC2InstanceConnectVPC',
      enableDnsHostnames: true,
      enableDnsSupport: true,
      maxAzs: 1,
      natGateways: 1,
      subnetConfiguration: [
        {
          name: 'public',
          subnetType: SubnetType.PUBLIC,
          mapPublicIpOnLaunch: true, // EC2のIPアドレスを公開するためtrueを指定する
        },
        {
          name: 'private',
          subnetType: SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          name: 'db',
          subnetType: SubnetType.PRIVATE_ISOLATED,
        }
      ],
    });

    // SecurityGroupを作成する
    const securityGroupForEC2 = new SecurityGroup(this, 'SecurityGroupForEC2', {
      vpc: vpc,
      securityGroupName: 'ForEC2',
    });
    const securityGroupForEIC = new SecurityGroup(this, 'SecurityGroupForEIC', {
      vpc: vpc,
      allowAllOutbound: false, // 指定のEC2のみに通信を許可するためfalseを指定
      securityGroupName: 'ForEIC',
    });
    securityGroupForEC2.addIngressRule(securityGroupForEIC, Port.tcp(22));
    securityGroupForEIC.addEgressRule(securityGroupForEC2, Port.tcp(22));

    // EC2インスタンスを作成する
    const ec2Instance = new Instance(this, 'EC2', {
      vpc,
      instanceName: 'DBmaintenance',
      instanceType: InstanceType.of(InstanceClass.T2, InstanceSize.MICRO),
      machineImage: MachineImage.latestAmazonLinux2023(),
      securityGroup: securityGroupForEC2,
    });

    // EC2インスタンスに初期セットアップを実行する
    const script = readFileSync('./lib/resources/user-data.sh', 'utf-8');
    ec2Instance.addUserData(script);

    // EC2 Instance Connectを作成する
    new CfnInstanceConnectEndpoint(this, 'InstanceConnect', {
      subnetId: vpc.selectSubnets({ subnetType: SubnetType.PRIVATE_ISOLATED }).subnetIds[0],
      securityGroupIds: [securityGroupForEIC.securityGroupId],
    });
  }
}
