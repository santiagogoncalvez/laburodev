import { useId, useState, useRef, useEffect } from "react"
import { Search, X } from "lucide-react"

const useSearchForm = ({ idTechnology, idLocation, idExperienceLevel, idText, initialText, onSearch, onTextFilter }) => {
  const timeoutId = useRef(null)
  const [searchText, setSearchText] = useState(initialText ?? "")

  // La URL manda (atrás/adelante): refleja el texto en el estado
  useEffect(() => {
    setSearchText(initialText ?? "")
  }, [initialText])

  const handleSubmit = (event) => {
    event.preventDefault()
    
    const formData = new FormData(event.currentTarget)
    
    if (event.target.name === idText) {
      return // ya lo manejamos en onChange
    }

    const filters = {
      technology: formData.get(idTechnology),
      location: formData.get(idLocation),
      experienceLevel: formData.get(idExperienceLevel)
    }

    onSearch(filters)
  }

  const handleTextChange = (event) => {
    const text = event.target.value
    setSearchText(text) // actualizamos el input inmediatamente

    // Debounce: Cancelar el timeout anterior
    if (timeoutId.current) {
      clearTimeout(timeoutId.current)
    }

    timeoutId.current = setTimeout(() => {
      onTextFilter(text)
    }, 500)
  }

  const clearSearch = () => {
    if (timeoutId.current) {
      clearTimeout(timeoutId.current)
    }
    setSearchText("")
  }

  return {
    searchText,
    handleSubmit,
    handleTextChange,
    clearSearch
  }
}

export function SearchFormSection ({ initialFilters, onTextFilter, onSearch, initialText }) {
  const idText = useId()
  const idTechnology = useId()
  const idLocation = useId()
  const idExperienceLevel = useId()

  const inputRef = useRef()

  // La URL manda (atrás/adelante): refleja el texto en el input no controlado
  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== (initialText ?? "")) {
      inputRef.current.value = initialText ?? ""
    }
  }, [initialText])

  const {
    searchText,
    handleSubmit,
    handleTextChange,
    clearSearch
  } = useSearchForm({ idTechnology, idLocation, idExperienceLevel, idText, initialText, onSearch, onTextFilter })

  const handleClearInput = (event) => {
    event.preventDefault()

    inputRef.current.value = ""
    clearSearch()
    onTextFilter("")
  }

  return (
     <section className="jobs-search">
        <h1>Encuentra tu próximo trabajo</h1>
        <p>Explora miles de oportunidades en el sector tecnológico.</p>

        <form onChange={handleSubmit} onSubmit={(event) => event.preventDefault()} id="empleos-search-form" role="search">
           <div className="search-bar">
              <Search size={20} />

              <input
                 ref={inputRef}
                 name={idText}
                 id="empleos-search-input"
                 type="search"
                 placeholder="Buscar trabajos, empresas o habilidades"
                 onChange={handleTextChange}
                 defaultValue={initialText}
              />

              {searchText ? (
                 <button type="button" className="icon-btn" onClick={handleClearInput} aria-label="Limpiar búsqueda"><X size={18} /></button>
              ) : null}
           </div>

           <div
               className="search-filters"
               key={`${initialFilters.technology}|${initialFilters.location}|${initialFilters.experienceLevel}`}
            >
              <select
                 name={idTechnology}
                 id="filter-technology"
                 defaultValue={initialFilters.technology}
              >
                 <option value="">Tecnología</option>
                 <optgroup label="Tecnologías populares">
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="react">React</option>
                    <option value="nodejs">Node.js</option>
                 </optgroup>
                 <option value="java">Java</option>
                 <hr />
                 <option value="csharp">C#</option>
                 <option value="c">C</option>
                 <option value="c++">C++</option>
                 <hr />
                 <option value="ruby">Ruby</option>
                 <option value="php">PHP</option>
              </select>

              <select
                 name={idLocation}
                 id="filter-location"
                 defaultValue={initialFilters.location}
              >
                 <option value="">Ubicación</option>
                 <option value="remoto">Remoto</option>
                 <option value="cdmx">Ciudad de México</option>
                 <option value="guadalajara">Guadalajara</option>
                 <option value="monterrey">Monterrey</option>
                 <option value="barcelona">Barcelona</option>
              </select>

              <select
                 name={idExperienceLevel}
                 id="filter-experience-level"
                 defaultValue={initialFilters.experienceLevel}
              >
                 <option value="">Nivel de experiencia</option>
                 <option value="junior">Junior</option>
                 <option value="mid-level">Mid-level</option>
                 <option value="senior">Senior</option>
                 <option value="lead">Lead</option>
              </select>
           </div>
        </form>

        <span id="filter-selected-value"></span>
     </section>
  );
}