import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { CfnInstanceConnectEndpoint, Instance, InstanceClass, InstanceSize, InstanceType, MachineImage, Port, SecurityGroup, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Credentials, DatabaseInstance, DatabaseInstanceEngine, SubnetGroup } from 'aws-cdk-lib/aws-rds';
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
      maxAzs: 2,
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
    const securityGroupForRDB = new SecurityGroup(this, 'SecurityGroupForRDB', {
      vpc: vpc,
      securityGroupName: 'ForRDB',
    });
    securityGroupForEC2.addIngressRule(securityGroupForEIC, Port.tcp(22));
    securityGroupForEIC.addEgressRule(securityGroupForEC2, Port.tcp(22));
    securityGroupForRDB.addIngressRule(securityGroupForEC2, Port.tcp(5432));

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

    // RDS用サブネットグループの作成
    const rdsSubnetGroup = new SubnetGroup(this, 'RdsSubnetGroup', {
      vpc: vpc,
      description: 'RDS Subnet Group',
      vpcSubnets: { subnetType: SubnetType.PRIVATE_ISOLATED },
      subnetGroupName: 'RdsSubnetGroup',
    });

    // TODO パスワードの設定が誤っている感じなので修正する
    const rdsPassword = this.node.tryGetContext('rdsPassword');
    const rdsCredentials = Credentials.fromPassword('postgres', rdsPassword);

    // RDSインスタンスの作成と設定を行う。今回はPostgreSQLを使用する
    const rdsInstance = new DatabaseInstance(this, 'RDS', {
      vpc: vpc,
      databaseName: 'mypgname',
      credentials: rdsCredentials,
      instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
      engine: DatabaseInstanceEngine.POSTGRES,
      multiAz: false,
      subnetGroup: rdsSubnetGroup,
      securityGroups: [securityGroupForRDB],
      removalPolicy: RemovalPolicy.DESTROY
    });
  }
}
