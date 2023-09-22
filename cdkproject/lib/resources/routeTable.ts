import { CfnInternetGateway, CfnNatGateway, CfnRoute, CfnRouteTable, CfnSubnet, CfnSubnetRouteTableAssociation, CfnVPC } from "aws-cdk-lib/aws-ec2";
import { Resource } from "./abstract/resource";
import { Construct } from "constructs";

// ルートのリソース情報を定義
interface RouteInfo {
    readonly id: string;
    readonly destinationCidrBlock: string;
    readonly gatewayId?: () => string;
    readonly natGatewayId?: () => string;
}

// 関連付けのリソース情報を定義
interface AssociationInfo {
    readonly id: string;
    readonly subnetId: () => string;
}

// ルートTableのリソース情報を定義
interface ResourceInfo {
    readonly id: string;
    readonly resourceName: string;
    readonly routes: RouteInfo[];
    readonly associations: AssociationInfo[];
    readonly assign: (routeTable: CfnRouteTable) => void;
}

export class RouteTable extends Resource {
    public public: CfnRouteTable;
    public app1a: CfnRouteTable;
    public app1c: CfnRouteTable;
    public db: CfnRouteTable;

    private readonly vpc: CfnVPC;
    private readonly subnetPublic1a: CfnSubnet;
    private readonly subnetPublic1c: CfnSubnet;
    private readonly subnetApp1a: CfnSubnet;
    private readonly subnetApp1c: CfnSubnet;
    private readonly subnetDb1a: CfnSubnet;
    private readonly subnetDb1c: CfnSubnet;
    private readonly internetGateway: CfnInternetGateway;
    private readonly natGateway1a: CfnNatGateway;
    private readonly natGateway1c: CfnNatGateway;
    private readonly resources: ResourceInfo[] = [
        {
            // パブリックサブネットに関連付けるルートテーブル。
            // VPC内の通信以外はInternetGatewayをターゲットにする
            id: 'RouteTablePublic',
            resourceName: 'rtb-public',
            routes: [{
                id: 'RoutePublic',
                destinationCidrBlock: '0.0.0.0/0',
                gatewayId: () => this.internetGateway.ref
            }],
            associations: [
                {
                    id: 'AssociationPublic1a',
                    subnetId: () => this.subnetPublic1a.ref
                },
                {
                    id: 'AssociationPublic1c',
                    subnetId: () => this.subnetPublic1c.ref
                }
            ],
            assign: routeTable => this.public = routeTable
        },
        {
            // アプリ層プライベートサブネット（ap-northeast-1a）に関連付けるルートテーブル
            // ローカルルート以外は同一AZのNATゲートウェイをターゲットにする
            id: 'RouteTableApp1a',
            resourceName: 'rtb-app-1a',
            routes: [{
                id: 'RouteApp1a',
                destinationCidrBlock: '0.0.0.0/0',
                natGatewayId: () => this.natGateway1a.ref
            }],
            associations: [
                {
                    id: 'AssociationApp1a',
                    subnetId: () => this.subnetApp1a.ref
                }
            ],
            assign: routeTable => this.app1a = routeTable
        },
        {
            // アプリ層プライベートサブネット（ap-northeast-1c）に関連付けるルートテーブル
            // ローカルルート以外は同一AZのNATゲートウェイをターゲットにする
            id: 'RouteTableApp1c',
            resourceName: 'rtb-app-1c',
            routes: [{
                id: 'RouteApp1c',
                destinationCidrBlock: '0.0.0.0/0',
                natGatewayId: () => this.natGateway1c.ref
            }],
            associations: [
                {
                    id: 'AssociationApp1c',
                    subnetId: () => this.subnetApp1c.ref
                }
            ],
            assign: routeTable => this.app1c = routeTable
        },
        {
            // データベース層のプライベートサブネットに関連付けるルートテーブル
            // ローカルルート設定以外は指定しない
            id: 'RouteTableDb',
            resourceName: 'rtb-db',
            routes: [],
            associations: [
                {
                    id: 'AssociationDb1a',
                    subnetId: () => this.subnetDb1a.ref
                },
                {
                    id: 'AssociationDb1c',
                    subnetId: () => this.subnetDb1c.ref
                }
            ],
            assign: routeTable => this.db = routeTable
        }
    ];

    constructor(
        vpc: CfnVPC,
        subnetPublic1a: CfnSubnet,
        subnetPublic1c: CfnSubnet,
        subnetApp1a: CfnSubnet,
        subnetApp1c: CfnSubnet,
        subnetDb1a: CfnSubnet,
        subnetDb1c: CfnSubnet,
        internetGateway: CfnInternetGateway,
        natGateway1a: CfnNatGateway,
        natGateway1c: CfnNatGateway
    ) {
        super();
        this.vpc = vpc;
        this.subnetPublic1a = subnetPublic1a;
        this.subnetPublic1c = subnetPublic1c;
        this.subnetApp1a = subnetApp1a;
        this.subnetApp1c = subnetApp1c;
        this.subnetDb1a = subnetDb1a;
        this.subnetDb1c = subnetDb1c;
        this.internetGateway = internetGateway;
        this.natGateway1a = natGateway1a;
        this.natGateway1c = natGateway1c;
    }

    createResources(scope: Construct): void {
        for (const resourceInfo of this.resources) {
            const routeTable = this.createRouteTable(scope, resourceInfo);
            resourceInfo.assign(routeTable);
        }
    }

    private createRouteTable(scope: Construct, resourceInfo: ResourceInfo) {
        const routeTable = new CfnRouteTable(scope, resourceInfo.id, {
            vpcId: this.vpc.ref,
            tags: [{
                key: 'Name',
                value: this.createResourceName(scope, resourceInfo.resourceName)
            }]
        });

        for (const routeInfo of resourceInfo.routes) {
            this.createRoute(scope, routeInfo, routeTable);
        }

        for (const associationInfo of resourceInfo.associations) {
            this.createAssociation(scope, associationInfo, routeTable);
        }

        return routeTable;
    }

    private createRoute(scope: Construct, routeInfo: RouteInfo, routeTable: CfnRouteTable) {
        const route = new CfnRoute(scope, routeInfo.id, {
            routeTableId: routeTable.ref,
            destinationCidrBlock: routeInfo.destinationCidrBlock
        });

        // ターゲットがインターネットゲートウェイもしくはNATゲートウェイの可能性があるため条件分岐
        if (routeInfo.gatewayId) {
            route.gatewayId = routeInfo.gatewayId();
        } else if (routeInfo.natGatewayId) {
            route.natGatewayId = routeInfo.natGatewayId();
        }
    }

    private createAssociation(scope: Construct, associationInfo: AssociationInfo, routeTable: CfnRouteTable) {
        new CfnSubnetRouteTableAssociation(scope, associationInfo.id, {
            routeTableId: routeTable.ref,
            subnetId: associationInfo.subnetId()
        });
    }
}
