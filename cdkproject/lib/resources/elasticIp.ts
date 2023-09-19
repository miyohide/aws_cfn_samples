import { CfnEIP } from "aws-cdk-lib/aws-ec2";
import { Resource } from "./abstract/resource";
import { Construct } from "constructs";

interface ResourceInfo {
    readonly id: string;
    readonly resourceName: string;
    readonly assign: (elasticIp: CfnEIP) => void;
}

export class ElasticIp extends Resource {
    public ngw1a: CfnEIP;
    public ngw1c: CfnEIP;

    private readonly resourcesInfo: ResourceInfo[] = [
        {
            id: 'ElasticIpNgw1a',
            resourceName: 'eip-ngw-1a',
            assign: elasticIp => this.ngw1a = elasticIp
        },
        {
            id: 'ElasticIpNgw1c',
            resourceName: 'eip-ngw-1c',
            assign: elasticIp => this.ngw1c = elasticIp
        },
    ];

    constructor() {
        super();
    }

    createResources(scope: Construct): void {
        for (const resourceInfo of this.resourcesInfo) {
            const elasticIp = this.createElasticIp(scope, resourceInfo);
            resourceInfo.assign(elasticIp);
        }
    }

    private createElasticIp(scope: Construct, resourceInfo: ResourceInfo) {
        const elasticIp = new CfnEIP(scope, resourceInfo.id, {
            domain: 'vpc',
            tags: [{
                key: 'Name',
                value: this.createResourceName(scope, resourceInfo.resourceName)
            }]
        });

        return elasticIp;
    }
}