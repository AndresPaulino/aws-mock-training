import { useState } from 'react';
import { Page, Panel, Button, Table, Field, Input, Select, Teach, Modal, Status, Alert, Check, useCloud, useCloudActions } from '../../kit';
import { rid, azsOf, REGIONS } from '../../../cloud/seed';
import type { Volume } from '../../../cloud/types';

const IOPS_DEFAULT: Record<Volume['type'], number> = { gp3: 3000, gp2: 0, io2: 3000, io1: 3000, st1: 0, sc1: 0 };

export function VolumeList() {
  const c = useCloud((s) => ({ vols: s.volumes, inst: s.instances.filter((i) => i.state !== 'terminated'), subnets: s.subnets, region: s.region }));
  const [sel, setSel] = useState<string | null>(null);
  const [modal, setModal] = useState<'create' | 'attach' | 'modify' | null>(null);
  const [form, setForm] = useState({ size: 20, type: 'gp3' as Volume['type'], iops: 3000, az: azsOf(c.region)[0], encrypted: true, instance: '' });
  const { mutate, patch, log } = useCloudActions();
  const v = c.vols.find((x) => x.id === sel);
  const azOfInst = (id: string) => c.subnets.find((s) => s.id === c.inst.find((i) => i.id === id)?.subnetId)?.az;
  const sameAz = c.inst.filter((i) => azOfInst(i.id) === v?.az);
  return (
    <Page title="Volumes" crumbs={[{ label: 'EC2', to: '/console/ec2' }, { label: 'Volumes' }]}>
      <Panel title="Volumes" counter={c.vols.length} actions={<>
        <Button disabled={!v || !!v.attachedTo} onClick={() => { setForm({ ...form, instance: sameAz[0]?.id ?? '' }); setModal('attach'); }}>Attach volume</Button>
        <Button disabled={!v?.attachedTo} onClick={() => { patch('volumes', v!.id, { attachedTo: undefined }); log('ec2', `Detached ${v!.id}`); }}>Detach volume</Button>
        <Button disabled={!v} onClick={() => { setForm({ ...form, size: v!.sizeGb, type: v!.type, iops: v!.iops }); setModal('modify'); }}>Modify volume</Button>
        <Button disabled={!v} onClick={() => { mutate((d) => { d.snapshots.push({ id: rid('snap'), name: '', region: d.region, createdAt: Date.now(), volumeId: v!.id, sizeGb: v!.sizeGb, encrypted: v!.encrypted, tier: 'standard' }); }); log('ec2', `Created snapshot of ${v!.id}`); }}>Create snapshot</Button>
        <Button disabled={!v || !!v.attachedTo} onClick={() => { mutate((d) => { d.volumes = d.volumes.filter((x) => x.id !== v!.id); }); log('ec2', `Deleted ${v!.id}`); setSel(null); }}>Delete volume</Button>
        <Button primary onClick={() => setModal('create')}>Create volume</Button></>}>
        <Table rows={c.vols} selected={sel} onSelect={setSel} columns={[
          { header: 'Volume ID', cell: (x) => x.id }, { header: 'Type', cell: (x) => x.type }, { header: 'Size', cell: (x) => `${x.sizeGb} GiB` },
          { header: 'IOPS', cell: (x) => (x.type === 'gp2' ? `${Math.min(16000, Math.max(100, x.sizeGb * 3))} (burst)` : x.iops || '–') },
          { header: 'Availability Zone', cell: (x) => x.az }, { header: 'Volume state', cell: (x) => <Status value={x.attachedTo ? 'In-use' : 'Available'} /> },
          { header: 'Attached resources', cell: (x) => x.attachedTo ?? <span className="text-[#8d6605]">– (still billing)</span> }, { header: 'Encryption', cell: (x) => (x.encrypted ? 'Encrypted' : 'Not encrypted') },
        ]} />
      </Panel>
      <Teach>An EBS volume lives in <b>one AZ</b> and attaches only to instances in that AZ. To move it to another AZ or Region: <b>snapshot → create volume in the new AZ</b> (or copy the snapshot to another Region). Unattached volumes still bill: a common cost-cleanup answer.</Teach>
      {modal === 'create' && <Modal title="Create volume" onClose={() => setModal(null)} footer={<Button primary onClick={() => { mutate((d) => { d.volumes.push({ id: rid('vol'), name: '', region: d.region, createdAt: Date.now(), sizeGb: form.size, type: form.type, iops: form.type === 'gp3' || form.type.startsWith('io') ? form.iops : 0, throughput: 125, az: form.az, encrypted: form.encrypted, kmsKeyId: form.encrypted ? 'key-aws-ebs' : undefined, deleteOnTermination: false }); }); log('ec2', `Created ${form.size} GiB ${form.type} volume in ${form.az}`); setModal(null); }}>Create volume</Button>}>
        <VolumeFields form={form} setForm={setForm} region={c.region} withAz />
      </Modal>}
      {modal === 'modify' && v && <Modal title={`Modify volume ${v.id}`} onClose={() => setModal(null)} footer={<Button primary disabled={form.size < v.sizeGb} onClick={() => { patch('volumes', v.id, { sizeGb: form.size, type: form.type, iops: form.type === 'gp3' || form.type.startsWith('io') ? form.iops : 0 }); log('ec2', `Modified ${v.id} to ${form.size} GiB ${form.type}`); setModal(null); }}>Modify</Button>}>
        <VolumeFields form={form} setForm={setForm} region={c.region} />
        {form.size < v.sizeGb && <Alert kind="error">EBS volumes can grow but never shrink.</Alert>}
        <Teach>Elastic Volumes: change size, type and IOPS <b>live</b> without detaching. gp2 → gp3 is a classic zero-downtime ~20% saving. Afterwards, extend the filesystem inside the OS.</Teach>
      </Modal>}
      {modal === 'attach' && v && <Modal title={`Attach ${v.id}`} onClose={() => setModal(null)} footer={<Button primary disabled={!form.instance} onClick={() => { patch('volumes', v.id, { attachedTo: form.instance }); log('ec2', `Attached ${v.id} to ${form.instance}`); setModal(null); }}>Attach volume</Button>}>
        {sameAz.length ? <Field label={`Instance (only instances in ${v.az} are listed)`}><Select value={form.instance} onChange={(x) => setForm({ ...form, instance: x })} options={sameAz.map((i) => ({ value: i.id, label: `${i.id} ${i.name}` }))} /></Field>
          : <Alert kind="warning">No instances in {v.az}. A volume can only attach to an instance in its own AZ.</Alert>}
      </Modal>}
    </Page>
  );
}

function VolumeFields({ form, setForm, region, withAz }: { form: { size: number; type: Volume['type']; iops: number; az: string; encrypted: boolean; instance: string }; setForm: (f: typeof form) => void; region: string; withAz?: boolean }) {
  const hdd = form.type === 'st1' || form.type === 'sc1';
  return <>
    <Field label="Volume type"><Select value={form.type} onChange={(t) => setForm({ ...form, type: t as Volume['type'], iops: IOPS_DEFAULT[t as Volume['type']] })} options={[
      { value: 'gp3', label: 'General Purpose SSD (gp3): 3,000 IOPS baseline, up to 16,000' }, { value: 'gp2', label: 'General Purpose SSD (gp2): 3 IOPS/GiB, burst' },
      { value: 'io2', label: 'Provisioned IOPS SSD (io2 Block Express): up to 256,000 IOPS, 99.999% durability' }, { value: 'io1', label: 'Provisioned IOPS SSD (io1)' },
      { value: 'st1', label: 'Throughput Optimized HDD (st1): big sequential reads, not bootable' }, { value: 'sc1', label: 'Cold HDD (sc1): cheapest, infrequent access' },
    ]} /></Field>
    <Field label="Size (GiB)" hint={hdd ? 'HDD volumes: minimum 125 GiB' : ''}><Input type="number" value={form.size} onChange={(e) => setForm({ ...form, size: Number(e.target.value) })} /></Field>
    {(form.type === 'gp3' || form.type.startsWith('io')) && <Field label="IOPS" hint={form.type.startsWith('io') ? 'io1/io2: up to 50 (io1) or 1,000 (io2) IOPS per GiB' : 'gp3: 3,000–16,000, independent of size'}><Input type="number" value={form.iops} onChange={(e) => setForm({ ...form, iops: Number(e.target.value) })} /></Field>}
    {withAz && <Field label="Availability Zone"><Select value={form.az} onChange={(a) => setForm({ ...form, az: a })} options={azsOf(region)} /></Field>}
    {withAz && <Check checked={form.encrypted} onChange={(e) => setForm({ ...form, encrypted: e })} label="Encrypt this volume (aws/ebs)" hint="Encryption is at rest, in transit to the instance, and in snapshots: no performance impact." />}
  </>;
}

export function SnapshotList() {
  const c = useCloud((s) => ({ snaps: s.snapshots, region: s.region }));
  const [sel, setSel] = useState<string | null>(null);
  const [vol, setVol] = useState<{ az: string } | null>(null);
  const [copy, setCopy] = useState<{ region: string; encrypt: boolean } | null>(null);
  const { mutate, patch, log } = useCloudActions();
  const s = c.snaps.find((x) => x.id === sel);
  return (
    <Page title="Snapshots" crumbs={[{ label: 'EC2', to: '/console/ec2' }, { label: 'Snapshots' }]}>
      <Panel title="Snapshots" counter={c.snaps.length} actions={<>
        <Button disabled={!s} onClick={() => setVol({ az: azsOf(c.region)[1] })}>Create volume from snapshot</Button>
        <Button disabled={!s} onClick={() => setCopy({ region: 'us-west-2', encrypt: !s!.encrypted })}>Copy snapshot</Button>
        <Button disabled={!s} onClick={() => { patch('snapshots', s!.id, { tier: s!.tier === 'standard' ? 'archive' : 'standard' }); log('ec2', `Moved ${s!.id} to ${s!.tier === 'standard' ? 'archive' : 'standard'} tier`); }}>{s?.tier === 'archive' ? 'Restore from archive' : 'Archive snapshot'}</Button>
        <Button disabled={!s} onClick={() => { mutate((d) => { d.snapshots = d.snapshots.filter((x) => x.id !== s!.id); }); setSel(null); }}>Delete</Button></>}>
        <Table rows={c.snaps} selected={sel} onSelect={setSel} empty="No snapshots. Create one from a volume." columns={[
          { header: 'Snapshot ID', cell: (x) => x.id }, { header: 'Volume size', cell: (x) => `${x.sizeGb} GiB` }, { header: 'Source volume', cell: (x) => x.volumeId },
          { header: 'Storage tier', cell: (x) => (x.tier === 'archive' ? 'Archive (75% cheaper, 24-72h restore)' : 'Standard') }, { header: 'Encryption', cell: (x) => (x.encrypted ? 'Encrypted' : 'Not encrypted') }, { header: 'Region', cell: (x) => x.region },
        ]} />
      </Panel>
      <Teach>Snapshots are <b>incremental</b> and stored in S3 (Regional, not tied to an AZ). That's how you move data between AZs, copy to another Region for DR, or <b>encrypt</b> an unencrypted volume (copy with encryption on). Automate them with <b>Data Lifecycle Manager</b> or <b>AWS Backup</b>.</Teach>
      {vol && s && <Modal title="Create volume from snapshot" onClose={() => setVol(null)} footer={<Button primary onClick={() => { mutate((d) => { d.volumes.push({ id: rid('vol'), name: '', region: d.region, createdAt: Date.now(), sizeGb: s.sizeGb, type: 'gp3', iops: 3000, throughput: 125, az: vol.az, encrypted: s.encrypted, deleteOnTermination: false }); }); log('ec2', `Created volume from ${s.id} in ${vol.az}`); setVol(null); }}>Create volume</Button>}>
        <Field label="Availability Zone (any AZ in the Region)"><Select value={vol.az} onChange={(az) => setVol({ az })} options={azsOf(c.region)} /></Field>
      </Modal>}
      {copy && s && <Modal title="Copy snapshot" onClose={() => setCopy(null)} footer={<Button primary onClick={() => { mutate((d) => { d.snapshots.push({ id: rid('snap'), name: `copy of ${s.id}`, region: copy.region, createdAt: Date.now(), volumeId: s.volumeId, sizeGb: s.sizeGb, encrypted: s.encrypted || copy.encrypt, tier: 'standard' }); }); log('ec2', `Copied ${s.id} to ${copy.region}${copy.encrypt ? ' with encryption' : ''}`); setCopy(null); }}>Copy snapshot</Button>}>
        <Field label="Destination Region"><Select value={copy.region} onChange={(r) => setCopy({ ...copy, region: r })} options={REGIONS.map((r) => ({ value: r.id, label: `${r.name} (${r.id})` }))} /></Field>
        <Check checked={copy.encrypt || s.encrypted} onChange={(e) => setCopy({ ...copy, encrypt: e })} label="Encrypt this snapshot" hint={s.encrypted ? 'Source is encrypted: copies stay encrypted.' : 'This is how you encrypt existing unencrypted data.'} />
      </Modal>}
    </Page>
  );
}
