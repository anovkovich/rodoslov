interface Props {
  icon: string;
  title: string;
  body: string;
}

export default function FeatureCard({ icon, title, body }: Props) {
  return (
    <div className="card bg-base-100 shadow-sm border border-base-200">
      <div className="card-body gap-2">
        <div className="text-3xl" aria-hidden>
          {icon}
        </div>
        <h3 className="card-title text-lg">{title}</h3>
        <p className="text-sm text-base-content/70">{body}</p>
      </div>
    </div>
  );
}
