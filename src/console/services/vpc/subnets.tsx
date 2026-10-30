import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Page, Panel, Button, Table, Field, Input, Select, Teach, ConfirmDelete, FormFooter, Status, Modal, Check, useCloud, useCloudActions } from '../../kit';
import { parseCidr, cidrContains, cidrOverlaps, usableIps } from '../../../cloud/net';
import { azsOf } from '../../../cloud/seed';
import { isPublicSubnet, subnetRouteTable } from '../../../cloud/reach';
import { useStore } from '../../../store/store';
import { createSubnet } from './ops';

export function SubnetList() {
  const subnets = useCloud((c) => c.subnets);
  const cloud = useCloud((c) => c);
  const [sel, setSel] = useState<string | null>(null);
  const [del, setDel] = useState(false);
  const [edit, setEdit] = useState(false);
  const { mutate, patch } = useCloudActions();
  const nav = useNavigate();
  const s = subnets.find((x) => x.id === sel);
  const used = (id: string) => useStore.getState().cloud.instances.filter((i) => i.subnetId === id && i.state !== 'terminated').length;
  return (
    <Page title="Subnets" crumbs={[{ label: 'VPC', to: '/console/vpc' }, { label: 'Subnets' }]}>
      <Panel title="Subnets" counter={subnets.length} actions={<><Button disabled={!s} onClick={() => setEdit(true)}>Edit subnet settings</Button><Button disabled={!s} onClick={() => setDel(true)}>Delete subnet</Button><Button primary onClick={() => nav('/console/vpc/subnets/create')}>Create subnet</Button></>}>
        <Table rows={subnets} selected={sel} onSelect={setSel} filterText={(x) => `${x.name} ${x.id} ${x.cidr} ${x.vpcId} ${x.az}`} columns={[
          { header: 'Name', cell: (x) => x.name || '–' },
          { header: 'Subnet ID', cell: (x) => x.id },
          { header: 'State', cell: () => <Status value="Available" /> },
          { header: 'VPC', cell: (x) => <Link to={`/console/vpc/vpcs/${x.vpcId}`}>{x.vpcId}</Link> },
          { header: 'IPv4 CIDR', cell: (x) => x.cidr },
          { header: 'Available IPv4', cell: (x) => usableIps(x.cidr) - cloud.instances.filter((i) => i.subnetId === x.id && i.state !== 'terminated').length },
          { header: 'Availability Zone', cell: (x) => x.az },
          { header: 'Route table', cell: (x) => { const rt = subnetRouteTable(cloud, x); return rt ? <Link to={`/console/vpc/route-tables/${rt.id}`}>{rt.name || rt.id}</Link> : '–'; } },
          { header: 'Type', cell: (x) => (isPublicSubnet(cloud, x) ? <span className="text-[#037f0c]">Public (route to IGW)</span> : 'Private') },
          { header: 'Auto-assign public IPv4', cell: (x) => (x.autoPublicIp ? 'Yes' : 'No') },
        ]} />
      </Panel>
      {edit && s && <Modal title="Edit subnet settings" onClose={() => setEdit(false)} footer={<Button primary onClick={() => setEdit(false)}>Save</Button>}>
        <Check checked={s.autoPublicIp} onChange={(v) => patch('subnets', s.id, { autoPublicIp: v })} label="Enable auto-assign public IPv4 address" hint="Instances launched here get a public IP. Needed (with an IGW route) for instances to be reachable from the internet. Note: public IPv4 addresses bill $0.005/hour each." />
      </Modal>}
      {del && s && <ConfirmDelete what={`subnet ${s.name || s.id}`} warning={used(s.id) ? 'This subnet has network interfaces in use (instances). AWS refuses the delete until they are terminated.' : undefined} onClose={() => setDel(false)}
        onConfirm={() => { if (used(s.id)) return; mutate((c) => { c.subnets = c.subnets.filter((x) => x.id !== s.id); for (const r of c.routeTables) r.subnetIds = r.subnetIds.filter((x) => x !== s.id); for (const n of c.nacls) n.subnetIds = n.subnetIds.filter((x) => x !== s.id); c.events.unshift({ t: Date.now(), service: 'ec2', msg: `Deleted subnet ${s.id}` }); }); setSel(null); }} />}
    </Page>
  );
}

export function CreateSubnet() {
  const vpcs = useCloud((c) => c.vpcs);
  const subnets = useCloud((c) => c.subnets);
  const region = useCloud((c) => c.region);
  const nav = useNavigate();
  const { mutate } = useCloudActions();
  const [vpcId, setVpcId] = useState(vpcs.find((v) => !v.isDefault)?.id ?? vpcs[0]?.id ?? '');
  const vpc = vpcs.find((v) => v.id === vpcId);
  const [rows, setRows] = useState([{ name: '', az: azsOf(region)[0], cidr: '' }]);
  const errOf = (cidr: string, i: number) => {
    if (!cidr) return 'Required';
    const p = parseCidr(cidr);
    if (!p) return 'Invalid CIDR, or host bits set (e.g. use 10.0.1.0/24, not 10.0.1.5/24)';
    if (p.prefix < 16 || p.prefix > 28) return 'Subnet size must be between /16 and /28';
    if (vpc && !cidrContains(vpc.cidr, cidr)) return `Must be inside the VPC CIDR ${vpc.cidr}`;
    if (subnets.some((s) => s.vpcId === vpcId && cidrOverlaps(s.cidr, cidr))) return 'Conflicts with an existing subnet in this VPC';
    if (rows.some((r, k) => k !== i && r.cidr && cidrOverlaps(r.cidr, cidr))) return 'Overlaps another subnet in this form';
    return '';
  };
  const invalid = rows.some((r, i) => errOf(r.cidr, i));
  const set = (i: number, p: Partial<(typeof rows)[0]>) => setRows(rows.map((r, k) => (k === i ? { ...r, ...p } : r)));
  return (
    <Page title="Create subnet" crumbs={[{ label: 'Subnets', to: '/console/vpc/subnets' }, { label: 'Create subnet' }]}>
      <form onSubmit={(e) => { e.preventDefault(); if (invalid) return; mutate((c) => { for (const r of rows) createSubnet(c, vpcId, r.name, r.cidr, r.az); }); nav('/console/vpc/subnets'); }}>
        <Panel title="VPC"><Field label="VPC ID"><Select value={vpcId} onChange={setVpcId} options={vpcs.map((v) => ({ value: v.id, label: `${v.id} (${v.name || 'no name'}) ${v.cidr}` }))} /></Field></Panel>
        <Teach>A subnet lives in exactly <b>one AZ</b>. For high availability, create matching subnets in at least two AZs. AWS reserves <b>5 IPs</b> in every subnet (network, router, DNS, future, broadcast), so a /24 gives 251 usable addresses. Whether it's public or private isn't set here: it depends on its <b>route table</b>.</Teach>
        {rows.map((r, i) => (
          <Panel key={i} title={`Subnet ${i + 1} of ${rows.length}`} actions={rows.length > 1 && <Button onClick={() => setRows(rows.filter((_, k) => k !== i))}>Remove</Button>}>
            <Field label="Subnet name"><Input value={r.name} onChange={(e) => set(i, { name: e.target.value })} placeholder="e.g. public-a" /></Field>
            <Field label="Availability Zone"><Select value={r.az} onChange={(v) => set(i, { az: v })} options={azsOf(region)} /></Field>
            <Field label="IPv4 subnet CIDR block" hint={vpc ? `VPC CIDR: ${vpc.cidr}` : ''} error={r.cidr ? errOf(r.cidr, i) || undefined : undefined}><Input value={r.cidr} onChange={(e) => set(i, { cidr: e.target.value.trim() })} placeholder="10.0.1.0/24" /></Field>
            {r.cidr && !errOf(r.cidr, i) && <p className="aws-hint -mt-2">{usableIps(r.cidr)} usable IP addresses</p>}
          </Panel>
        ))}
        <div className="mb-4"><Button onClick={() => setRows([...rows, { name: '', az: azsOf(region)[rows.length % 3], cidr: '' }])}>Add new subnet</Button></div>
        <FormFooter onCancel={() => nav('/console/vpc/subnets')} submitLabel="Create subnet" disabled={invalid || !vpcId} />
      </form>
    </Page>
  );
}
