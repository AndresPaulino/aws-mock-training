import { Routes, Route, Link } from 'react-router-dom';
import { SideNav, Page, Panel, Teach, useCloud } from '../../kit';
import { SecurityGroupRoutes } from '../vpc/SecurityGroups';
import { ElasticIpList } from '../vpc/gateways';
import { InstanceList, LaunchWizard, InstanceDetail } from './instances';
import { VolumeList, SnapshotList } from './storage';
import { LaunchTemplatesPage, TargetGroupsPage, LoadBalancersPage, AutoScalingPage } from './elb';

function Dashboard() {
  const c = useCloud((s) => ({
    running: s.instances.filter((i) => i.state === 'running').length, all: s.instances.filter((i) => i.state !== 'terminated').length,
    vols: s.volumes.length, snaps: s.snapshots.length, sgs: s.securityGroups.length, eips: s.elasticIps.length, lbs: s.loadBalancers.length, asgs: s.asgs.length, region: s.region,
  }));
  const tiles: [string, number, string][] = [['Instances (running)', c.running, 'instances'], ['Instances (all states)', c.all, 'instances'], ['Volumes', c.vols, 'volumes'], ['Snapshots', c.snaps, 'snapshots'], ['Security groups', c.sgs, 'security-groups'], ['Elastic IPs', c.eips, 'eips'], ['Load balancers', c.lbs, 'load-balancers'], ['Auto Scaling groups', c.asgs, 'auto-scaling']];
  return (
    <Page title="EC2 Dashboard">
      <Panel title="Resources" desc={`You are using the following Amazon EC2 resources in the ${c.region} Region:`}>
        <div className="grid sm:grid-cols-4 gap-3">{tiles.map(([l, n, p]) => <Link key={l} to={`/console/ec2/${p}`} className="block rounded-lg border border-[#e9ebed] px-4 py-3"><span className="block text-[13px] text-[#5f6b7a]">{l}</span><span className="text-[24px] font-bold">{n}</span></Link>)}</div>
      </Panel>
      <Panel title="Launch instance" desc="To get started, launch an Amazon EC2 instance, which is a virtual server in the cloud.">
        <Link to="/console/ec2/instances/launch" className="aws-btn aws-btn-primary inline-block" style={{ textDecoration: 'none' }}>Launch instance</Link>
      </Panel>
      <Teach>EC2 is <b>IaaS</b>: you manage the OS, patching and scaling. On the exam, "<i>least operational overhead</i>" usually points away from EC2 toward Fargate, Lambda or a managed service, unless the scenario needs OS access, special licensing or specific hardware.</Teach>
    </Page>
  );
}

export default function Ec2Console() {
  return (
    <div className="flex">
      <SideNav title="EC2" items={[
        { label: 'Dashboard', to: '/console/ec2' },
        { section: 'Instances' }, { label: 'Instances', to: '/console/ec2/instances' }, { label: 'Launch Templates', to: '/console/ec2/launch-templates' },
        { section: 'Elastic Block Store' }, { label: 'Volumes', to: '/console/ec2/volumes' }, { label: 'Snapshots', to: '/console/ec2/snapshots' },
        { section: 'Network & Security' }, { label: 'Security Groups', to: '/console/ec2/security-groups' }, { label: 'Elastic IPs', to: '/console/ec2/eips' },
        { section: 'Load Balancing' }, { label: 'Load Balancers', to: '/console/ec2/load-balancers' }, { label: 'Target Groups', to: '/console/ec2/target-groups' },
        { section: 'Auto Scaling' }, { label: 'Auto Scaling Groups', to: '/console/ec2/auto-scaling' },
      ]} />
      <div className="flex-1 min-w-0">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="instances" element={<InstanceList />} />
          <Route path="instances/launch" element={<LaunchWizard />} />
          <Route path="instances/:id" element={<InstanceDetail />} />
          <Route path="volumes" element={<VolumeList />} />
          <Route path="snapshots" element={<SnapshotList />} />
          <Route path="security-groups/*" element={<SecurityGroupRoutes base="/console/ec2/security-groups" />} />
          <Route path="eips" element={<ElasticIpList />} />
          <Route path="launch-templates/*" element={<LaunchTemplatesPage />} />
          <Route path="target-groups/*" element={<TargetGroupsPage />} />
          <Route path="load-balancers/*" element={<LoadBalancersPage />} />
          <Route path="auto-scaling/*" element={<AutoScalingPage />} />
        </Routes>
      </div>
    </div>
  );
}
