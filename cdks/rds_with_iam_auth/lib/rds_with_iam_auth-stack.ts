import * as cdk from 'aws-cdk-lib';
import { Aws, RemovalPolicy } from 'aws-cdk-lib';
import { GatewayVpcEndpointAwsService, Instance, InstanceClass, InstanceSize, InstanceType, InterfaceVpcEndpointAwsService, MachineImage, Port, SecurityGroup, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { ManagedPolicy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Credentials, DatabaseInstance, DatabaseInstanceEngine, SubnetGroup } from 'aws-cdk-lib/aws-rds';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export class RdsWithIamAuthStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPCを作成する
    const vpc = new Vpc(this, 'Vpc', {
      vpcName: 'MyVPC',
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        // {
        //   // パブリックサブネット用
        //   cidrMask: 24,
        //   name: 'public',
        //   subnetType: SubnetType.PUBLIC
        // },
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

    // EC2用セキュリティグループ
    const ec2SecurityGroup = new SecurityGroup(this, 'EC2SecurityGroup', {
      securityGroupName: 'EC2SecurityGroup',
      vpc: vpc,
      allowAllOutbound: true
    });

    // SSMエンドポイント用セキュリティグループ
    const ssmSecurityGroup = new SecurityGroup(this, 'SSMSecurityGroup', {
      securityGroupName: 'SSMSecurityGroup',
      vpc: vpc,
      allowAllOutbound: true
    });

    // SSMエンドポイントの設定
    vpc.addInterfaceEndpoint('SSMEndpoint', {
      service: InterfaceVpcEndpointAwsService.SSM,
      securityGroups: [ssmSecurityGroup]
    });
    vpc.addInterfaceEndpoint('SSMMessagesEndpoint', {
      service: InterfaceVpcEndpointAwsService.SSM_MESSAGES,
      securityGroups: [ssmSecurityGroup]
    });
    vpc.addInterfaceEndpoint('EC2MessagesEndpoint', {
      service: InterfaceVpcEndpointAwsService.EC2_MESSAGES,
      securityGroups: [ssmSecurityGroup]
    });
    ssmSecurityGroup.addIngressRule(ec2SecurityGroup, Port.HTTPS);

    const ec2Subnet = vpc.selectSubnets({
      subnetGroupName: 'ec2'
    });
    const dbSubnet = vpc.selectSubnets({
      subnetGroupName: 'rds'
    });

    // GatewayタイプのVPCエンドポイントを作成
    vpc.addGatewayEndpoint('S3Endpoint', {
      service: GatewayVpcEndpointAwsService.S3,
      subnets: [ec2Subnet],
    });

    // EC2インスタンスプロファイル用IAMロールを作成
    const ec2Role = new Role(this, "EC2Role", {
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
      roleName: "EC2Role",
      description: "IAM Role for EC2"
    });
    // IAMロールにSSMのポリシーをアタッチ
    ec2Role.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName(
        "AmazonSSMManagedInstanceCore"
      )
    );
    // アクセスログの保存用にCloudWatchのアクセスポリシーをアタッチ
    ec2Role.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName(
        "CloudWatchLogsFullAccess"
      )
    );

    // EC2インスタンスを作成する
    const ec2 = new Instance(this, "MyEC2", {
      instanceType: InstanceType.of(
        InstanceClass.T3, InstanceSize.MICRO
      ),
      machineImage: MachineImage.latestAmazonLinux2023(),
      vpc: vpc,
      vpcSubnets: ec2Subnet,
      role: ec2Role,
    });

    // CloudWatchロググループを作成
    const logGroup = new LogGroup(this, "MyLogGroupForSSM", {
      logGroupName: "/ssm/ec2/session",
      retention: RetentionDays.ONE_DAY
    });

    // // RDS用の認証情報
    // const secret = new Secret(this, "MyDBCredentialSecrets", {
    //   secretName: "MyDBCredentialSecret",
    //   generateSecretString: {
    //     secretStringTemplate: JSON.stringify({
    //       username: "postgres"
    //     }),
    //     excludePunctuation: true,
    //     includeSpace: false,
    //     generateStringKey: "password"
    //   },
    // });

    // // RDS用セキュリティグループを作成
    // const rdsSG = new SecurityGroup(this, "MySecurityGroupForRDS", {
    //   vpc: vpc,
    //   allowAllOutbound: true,
    //   description: "Security Group for RDS"
    // });

    // // RDSサブネットグループを作成する
    // const dbSubnetGroup = new SubnetGroup(this, "dbSubnetGroup", {
    //   vpc: vpc,
    //   subnetGroupName: "MyRDSSubnetGroup",
    //   vpcSubnets: dbSubnet,
    //   description: "Subnet Group for RDS"
    // });

    // // RDSインスタンスを作成（PostgreSQL）
    // const rdsInstance = new DatabaseInstance(this, "MyRDSInstance", {
    //   instanceIdentifier: "MyRDSInstancePostgreSQL",
    //   vpc: vpc,
    //   engine: DatabaseInstanceEngine.POSTGRES,
    //   instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
    //   databaseName: "mypostgredb",
    //   multiAz: false,
    //   subnetGroup: dbSubnetGroup,
    //   securityGroups: [rdsSG],
    //   removalPolicy: RemovalPolicy.DESTROY,
    //   iamAuthentication: true,
    //   credentials: Credentials.fromSecret(secret)
    // });

    // rdsInstance.grantConnect(ec2Role);
    // // ec2Role.addToPolicy(
    // //   new PolicyStatement({
    // //     actions: [
    // //       "rds-db:connect"
    // //     ],
    // //     resources: [
    // //       `arn:aws:rds-db:${Aws.REGION}:${Aws.ACCOUNT_ID}:dbuser:${rdsInstance.instanceResourceId}/myiam_db_user`
    // //     ]
    // //   })
    // // );

    // rdsInstance.connections.allowDefaultPortFrom(ec2, "allow connect from ec2");
  }
}
