import { CapsuleTile } from "../components/capsule-tile";
import { LoadError } from "../components/load-error";
import { Loading } from "../components/loading";
import { Screen } from "../components/screen";
import ui from "../components/ui.module.css";
import { useActivity, useCapsules } from "../hooks/use-bar-data";
import { useNow } from "../hooks/use-now";
import {
  activityAmount,
  activityPhrase,
  formatActivityTime,
  groupActivity,
} from "../lib/activity-format";
import { cx } from "../lib/cx";
import { IMAGE_WIDTH, sizedImage } from "../lib/images";
import styles from "./activity-page.module.css";

export default function ActivityPage() {
  const activity = useActivity();
  const capsules = useCapsules();
  const now = useNow();

  const error = activity.error ?? capsules.error;
  if (error) return <LoadError error={error} />;
  if (!activity.data || !capsules.data) return <Loading />;

  const byId = new Map(capsules.data.map((c) => [c.id, c]));
  const groups = groupActivity(
    activity.data.filter((row) => byId.has(row.capsule_id)),
    now,
  );

  return (
    <Screen gap={20} withNav>
      <header className={styles.header}>
        <h1 className={ui.screenTitle}>Activity</h1>
        <p className={ui.screenSubtitle}>Every pour and restock</p>
      </header>

      {groups.length === 0 && <p className={ui.emptyState}>No pours yet tonight.</p>}

      {groups.map((group) => (
        <section key={group.label} className={styles.group}>
          <h2 className={ui.sectionLabel}>{group.label}</h2>
          {group.rows.map((row) => {
            const capsule = byId.get(row.capsule_id);
            if (!capsule) return null;
            return (
              <div key={row.id} className={styles.row}>
                <CapsuleTile
                  src={sizedImage(capsule.img_box, IMAGE_WIDTH.thumb)}
                  size={46}
                  radius={12}
                  inset={3}
                />
                <div className={ui.rowText}>
                  <p className={styles.sentence}>
                    <strong>{row.actor_name}</strong> {activityPhrase(row.kind, capsule.name)}
                  </p>
                  <time className={ui.rowMeta} dateTime={row.created_at}>
                    {formatActivityTime(new Date(row.created_at), now)}
                  </time>
                </div>
                <span className={cx(styles.amount, row.kind !== "take" && styles.amountIn)}>
                  {activityAmount(row.kind, row.amount)}
                </span>
              </div>
            );
          })}
        </section>
      ))}
    </Screen>
  );
}
