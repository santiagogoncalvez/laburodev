import { Building2, Heart, MapPin, Signal, Wifi, Home } from "lucide-react";
import { Link } from "./Link";
import { formatJobLevel } from "../constants/levels.js";
import styles from "./JobCard.module.css";
import { useFavoritesStore } from "../store/favoritesStore";

function JobCardFavoriteButton({ jobId }) {
   const { toggleFavorite, isFavorite } = useFavoritesStore();
   const fav = isFavorite(jobId);

   return (
      <button
         className={`icon-btn${fav ? " is-active" : ""}`}
         onClick={() => toggleFavorite(jobId)}
         aria-label={fav ? "Quitar de favoritos" : "Agregar a favoritos"}
         aria-pressed={fav}
      >
         <Heart size={18} fill={fav ? "currentColor" : "none"} />
      </button>
   );
}

function techList(job) {
   const tech = job.data?.technology;
   if (Array.isArray(tech)) return tech.slice(0, 3);
   if (typeof tech === "string") return [tech];
   return [];
}

export function JobCard({ job }) {
   return (
      <article className="job-listing-card">
         <div>
            <h3>
               <Link className={styles.title} href={`/jobs/${job.id}`}>
                  {job.title}
               </Link>
            </h3>
            <div className="meta-row">
               <span className="meta-item">
                  <Building2 size={14} aria-hidden="true" />
                  {job.company}
               </span>
               <span className="meta-item">
                  <MapPin size={14} aria-hidden="true" />
                  {job.location}
               </span>
               <span className="meta-item">
                  {job.data?.modality === "remoto"
                     ? <Wifi size={14} aria-hidden="true" />
                     : <Home size={14} aria-hidden="true" />}
                  {job.data?.modality === "remoto" ? "Remoto" : "Presencial"}
               </span>
               <span className="meta-item">
                  <Signal size={14} aria-hidden="true" />
                  {formatJobLevel(job.data.level)}
               </span>
            </div>
            <p>{job.content?.description}</p>
            <div className="badges">
               {techList(job).map((t) => (
                  <span key={t} className="badge">{t}</span>
               ))}
            </div>
            {job.createdAt && (
               <span className={styles.createdAt}>
                  Publicado: {new Date(job.createdAt).toLocaleDateString("es-AR")}
               </span>
            )}
         </div>
         <div className={styles.actions}>
            <JobCardFavoriteButton jobId={job.id} />
         </div>
      </article>
   );
}
