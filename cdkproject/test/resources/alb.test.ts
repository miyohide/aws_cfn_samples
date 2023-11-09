import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as Cdkproject from '../../lib/cdkproject-stack';

test('ALB Created', () => {
    const app = new cdk.App({});
    const stack = new Cdkproject.CdkprojectStack(app, 'MyTestStack');
    const template = Template.fromStack(stack);

    // ALBが想定通り作られているか
    template.resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 1);
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
        IpAddressType: 'ipv4',
        Scheme: 'internet-facing',
        SecurityGroups: Match.anyValue(),
        Subnets: Match.anyValue(),
        Type: 'application'
    });
    template.resourceCountIs('AWS::ElasticLoadBalancingV2::TargetGroup', 1);
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
        Port: 80,
        Protocol: 'HTTP',
        TargetType: 'instance',
        Targets: Match.anyValue(),
        VpcId: Match.anyValue(),
    });
    template.resourceCountIs('AWS::ElasticLoadBalancingV2::Listener', 1);
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
        DefaultActions: [{
            Type: 'forward',
            ForwardConfig: {
                TargetGroups: [{
                    TargetGroupArn: Match.anyValue(),
                    Weight: 1
                }]
            }
        }],
        LoadBalancerArn: Match.anyValue(),
        Port: 80,
        Protocol: 'HTTP',
    });
});
