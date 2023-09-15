import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Vpc } from './resources/vpc';
import { Subnet } from './resources/subnet';

export class CdkprojectStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // VPCを作成する
        const vpc = new Vpc();
        vpc.createResources(this);
        // Subnetを作成する
        const subnet = new Subnet(vpc.vpc);
        subnet.createResources(this);
    }
}
