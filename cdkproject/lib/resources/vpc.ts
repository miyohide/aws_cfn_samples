import { CfnVPC } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { Resource } from "./abstract/resource";

export class Vpc extends Resource {
    public vpc: CfnVPC;

    constructor() {
        super();
    };

    public createResources(scope: Construct) {
        const systemName = scope.node.tryGetContext('systemName');
        const envType = scope.node.tryGetContext('envType');
        // VPCを作成する
        this.vpc = new CfnVPC(scope, 'Vpc', {
            cidrBlock: '10.0.0.0/16',
            tags: [{ key: 'Name', value: this.createResourceName(scope, 'vpc') }]
        });
    }
}
