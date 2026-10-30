import { Routes, Route } from 'react-router-dom';
import { SideNav } from '../../kit';
import { SecurityGroupRoutes } from './SecurityGroups';
import { VpcDashboard, VpcList, CreateVpc, VpcDetail } from './vpcs';
import { SubnetList, CreateSubnet } from './subnets';
import { RouteTableRoutes } from './routeTables';
import { IgwList, NatList, CreateNat, EndpointList, CreateEndpoint, PeeringList, NaclRoutes, ElasticIpList } from './gateways';
import { Reachability } from './Reachability';

export default function VpcConsole() {
  return (
    <div className="flex">
      <SideNav title="VPC dashboard" items={[
        { label: 'VPC dashboard', to: '/console/vpc' },
        { section: 'Virtual private cloud' },
        { label: 'Your VPCs', to: '/console/vpc/vpcs' },
        { label: 'Subnets', to: '/console/vpc/subnets' },
        { label: 'Route tables', to: '/console/vpc/route-tables' },
        { label: 'Internet gateways', to: '/console/vpc/igws' },
        { label: 'Elastic IPs', to: '/console/vpc/eips' },
        { label: 'NAT gateways', to: '/console/vpc/nat-gateways' },
        { label: 'Endpoints', to: '/console/vpc/endpoints' },
        { label: 'Peering connections', to: '/console/vpc/peering' },
        { section: 'Security' },
        { label: 'Network ACLs', to: '/console/vpc/nacls' },
        { label: 'Security groups', to: '/console/vpc/security-groups' },
        { section: 'Network Analysis' },
        { label: 'Reachability Analyzer', to: '/console/vpc/reachability' },
      ]} />
      <div className="flex-1 min-w-0">
        <Routes>
          <Route index element={<VpcDashboard />} />
          <Route path="vpcs" element={<VpcList />} />
          <Route path="vpcs/create" element={<CreateVpc />} />
          <Route path="vpcs/:id" element={<VpcDetail />} />
          <Route path="subnets" element={<SubnetList />} />
          <Route path="subnets/create" element={<CreateSubnet />} />
          <Route path="route-tables/*" element={<RouteTableRoutes />} />
          <Route path="igws" element={<IgwList />} />
          <Route path="eips" element={<ElasticIpList />} />
          <Route path="nat-gateways" element={<NatList />} />
          <Route path="nat-gateways/create" element={<CreateNat />} />
          <Route path="endpoints" element={<EndpointList />} />
          <Route path="endpoints/create" element={<CreateEndpoint />} />
          <Route path="peering" element={<PeeringList />} />
          <Route path="nacls/*" element={<NaclRoutes />} />
          <Route path="security-groups/*" element={<SecurityGroupRoutes base="/console/vpc/security-groups" />} />
          <Route path="reachability" element={<Reachability />} />
        </Routes>
      </div>
    </div>
  );
}
