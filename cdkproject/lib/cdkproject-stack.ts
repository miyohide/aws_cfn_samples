import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Vpc } from './resources/vpc';
import { Subnet } from './resources/subnet';
import { InternetGateway } from './resources/internetGateway';
import { ElasticIp } from './resources/elasticIp';

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
    }
}
