import * as cdk from 'aws-cdk-lib';
import { RemovalPolicy } from 'aws-cdk-lib';
import { AmazonLinuxGeneration, AmazonLinuxImage, CfnInstanceConnectEndpoint, GatewayVpcEndpointAwsService, Instance, InstanceClass, InstanceSize, InstanceType, Port, SecurityGroup, SubnetType, UserData, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Effect, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { DatabaseInstance, DatabaseInstanceEngine, SubnetGroup } from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';

export class RdsMaintenanceEnvStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPCとnatGateway用のPublic Subnet、EC2用のPrivate Subnetと
    // DB用のPrivate Subnetを作成する
    const vpc = new Vpc(this, 'VPC', {
      cidr: '10.0.0.0/16',
      vpcName: 'MyRDSTestVPC',
      natGateways: 0,
      maxAzs: 2,
      subnetConfiguration: [
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

    // GatewayタイプのVPCエンドポイントを作成する
    vpc.addGatewayEndpoint('s3Endpoint', {
      service: GatewayVpcEndpointAwsService.S3,
      subnets: [{ subnetType: SubnetType.PRIVATE_WITH_EGRESS }]
    });

    // IAMロールを作成
    const role = new Role(this, 'Role', {
      roleName: 'EC2RoleForRDSIAMAuth',
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
    });

    // RDSへのIAM認証に必要なポリシーをアタッチ
    role.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["rds-db:connect"],
      resources: ["*"]
    }));

    const userData = UserData.forLinux({
      shebang: '#!/bin/bash',
    });
    userData.addCommands(
      'dnf install -y mariadb105',
      'dnf install -y postgresql15'
    );

    // EC2インスタンスを作成する
    const ec2Instance = new Instance(this, 'EC2Instance', {
      instanceName: 'DBMaintenance',
      vpc: vpc,
      vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
      securityGroup: ec2Sg,
      instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
      machineImage: new AmazonLinuxImage({
        generation: AmazonLinuxGeneration.AMAZON_LINUX_2023,
      }),
      userData: userData,
      role: role,
    });

    // RDS用のセキュリティグループを作成する
    const rdsSg = new SecurityGroup(this, 'rdsSg', {
      vpc: vpc,
      allowAllOutbound: true
    });

    // RDS サブネットグループを作成する
    const dbSubnetGroup = new SubnetGroup(this, 'dbSubnetGroup', {
      vpc: vpc,
      subnetGroupName: 'MyRDSTestDBSubnetGroup',
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_ISOLATED,
        onePerAz: true,
      },
      description: 'My RDS TestDB SubnetGroup'
    });

    // RDSインスタンスを作成する（PostgreSQL）
    const rdsInstance = new DatabaseInstance(this, 'RDSInstance', {
      instanceIdentifier: 'MyRDSTestPostgresDB',
      vpc: vpc,
      engine: DatabaseInstanceEngine.POSTGRES,
      instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
      databaseName: 'mypgdb',
      multiAz: false,
      subnetGroup: dbSubnetGroup,
      securityGroups: [rdsSg],
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // RDSインスタンスを作成する（MySQL）
    // const rdsInstance = new DatabaseInstance(this, 'RDSInstance', {
    //   instanceIdentifier: 'MyRDSTestMySQLDB',
    //   vpc: vpc,
    //   engine: DatabaseInstanceEngine.MYSQL,
    //   instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
    //   databaseName: 'mypgdb',
    //   multiAz: false,
    //   subnetGroup: dbSubnetGroup,
    //   securityGroups: [rdsSg],
    //   removalPolicy: RemovalPolicy.DESTROY,
    // });

    rdsInstance.connections.allowDefaultPortFrom(ec2Instance, "allow connect from ec2");
  }
}
