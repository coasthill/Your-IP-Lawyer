export default function DashboardLoading() {
  return (
    <div className="py-10" role="status" aria-live="polite">
      <p className="eyebrow-muted animate-pulse-soft">Retrieving the record…</p>
      <div className="rule mt-6 max-w-md" role="presentation" />
    </div>
  );
}
