import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Vpc } from './resources/vpc';
import { Subnet } from './resources/subnet';
import { InternetGateway } from './resources/internetGateway';
import { ElasticIp } from './resources/elasticIp';
import { NatGateway } from './resources/natGateway';
import { RouteTable } from './resources/routeTable';

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
    }
}
