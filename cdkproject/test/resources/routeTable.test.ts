import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as Cdkproject from '../../lib/cdkproject-stack';

test('RouteTable Created', () => {
    const app = new cdk.App({});
    const stack = new Cdkproject.CdkprojectStack(app, 'MyTestStack');
    const template = Template.fromStack(stack);

    // RouteTableが想定通り作られているか
    template.resourceCountIs('AWS::EC2::Route', 3);
    template.resourceCountIs('AWS::EC2::SubnetRouteTableAssociation', 6);
    template.hasResourceProperties('AWS::EC2::Route', {
        RouteTableId: Match.anyValue(),
        DestinationCidrBlock: '0.0.0.0/0',
        GatewayId: Match.anyValue()
    });
    template.hasResourceProperties('AWS::EC2::Route', {
        RouteTableId: Match.anyValue(),
        DestinationCidrBlock: '0.0.0.0/0',
        NatGatewayId: Match.anyValue()
    });
    template.hasResourceProperties('AWS::EC2::SubnetRouteTableAssociation', {
        RouteTableId: Match.anyValue(),
        SubnetId: Match.anyValue()
    });
});
