import HostelNexusWidget from '../components/HostelNexusWidget';

export default function HostelNexus() {
  return (
    <div className="hostelnexus-page" style={{ padding: '1.25rem' }}>
      <h2>HostelNexus</h2>
      <p className="muted">HostelNexus assistant — use the floating widget at bottom-right.</p>
      <HostelNexusWidget />
    </div>
  );
}
