import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Vpc } from './resources/vpc';
import { Subnet } from './resources/subnet';
import { InternetGateway } from './resources/internetGateway';
import { ElasticIp } from './resources/elasticIp';
import { NatGateway } from './resources/natGateway';
import { RouteTable } from './resources/routeTable';
import { NetworkAcl } from './resources/networkAcl';
import { IamRole } from './resources/iamRole';
import { SecurityGroup } from './resources/securityGroup';
import {Ec2} from "./resources/ec2";
import { Alb } from './resources/alb';

export class CdkprojectStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // VPCを作成する
        const vpc = new Vpc();
        vpc.createResources(this);
        // Subnetを作成する
        const subnet = new Subnet(vpc.vpc);
        subnet.createResources(this);
        // Internet Gatewayを作成する
        const internetGateway = new InternetGateway(vpc.vpc);
        internetGateway.createResources(this);
        // Elastic IPを作成する
        const elasticIp = new ElasticIp();
        elasticIp.createResources(this);
        // Nat Gatewayを作成する
        const natGateway = new NatGateway(
            subnet.public1a,
            subnet.public1c,
            elasticIp.ngw1a,
            elasticIp.ngw1c
        );
        natGateway.createResources(this);
        // Route Tableを作成する
        const routeTable = new RouteTable(
            vpc.vpc,
            subnet.public1a,
            subnet.public1c,
            subnet.app1a,
            subnet.app1c,
            subnet.db1a,
            subnet.db1c,
            internetGateway.igw,
            natGateway.ngw1a,
            natGateway.ngw1c
        );
        routeTable.createResources(this);
        // Network ACLを作成する
        const networkAcl = new NetworkAcl(
            vpc.vpc,
            subnet.public1a,
            subnet.public1c,
            subnet.app1a,
            subnet.app1c,
            subnet.db1a,
            subnet.db1c
        );
        networkAcl.createResources(this);
        // IAM Roleを作る
        const iamRole = new IamRole();
        iamRole.createResources(this);
        // Security Groupを作る
        const securityGroup = new SecurityGroup(vpc.vpc);
        securityGroup.createResources(this);
        // EC2を作る
        const ec2 = new Ec2(
            subnet.app1a,
            subnet.app1c,
            iamRole.instanceProfileEc2,
            securityGroup.ec2
        );
        ec2.createResources(this);
        // ALBをつくる
        const alb = new Alb(
            vpc.vpc,
            subnet.public1a,
            subnet.public1c,
            securityGroup.alb,
            ec2.instance1a,
            ec2.instance1c
        );
        alb.createResources(this);
    }
}
