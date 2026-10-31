import { JobCard } from './JobCard.jsx'

export function JobListings ({ jobs, onClear }) {
  return (
    <>
      <div className="jobs-listings">
        {
          jobs.length === 0 && (
            <div className="empty-state">
              <p>No se han encontrado empleos que coincidan con los criterios de búsqueda.</p>
              {onClear && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={onClear}>
                  Limpiar búsqueda
                </button>
              )}
            </div>
          )
        }

        {jobs.map(job => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
    </>
  )
}
