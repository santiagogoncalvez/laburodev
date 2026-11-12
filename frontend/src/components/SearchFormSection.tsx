import { Search, X } from 'lucide-react';
import {
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { API_URL } from '@/config';
import { JOB_LEVELS } from '@/constants/levels';
import { formatTechnology } from '@/constants/technologies';

/** Valores de los selects que vienen de GET /jobs/options (DB real). */
interface FilterOptions {
  technologies: string[];
  locations: string[];
}

/** Filtros del buscador: forma compartida con SearchPage (la URL manda). */
export interface JobFilters {
  technology: string;
  location: string;
  experienceLevel: string;
}

/** FormData.get devuelve string | File | null; los selects siempre dan string. */
function getFilterValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return value instanceof File ? '' : (value ?? '');
}

interface UseSearchFormParams {
  idTechnology: string;
  idLocation: string;
  idExperienceLevel: string;
  idText: string;
  initialText: string;
  onSearch: (filters: JobFilters) => void;
  onTextFilter: (text: string) => void;
}

const useSearchForm = ({
  idTechnology,
  idLocation,
  idExperienceLevel,
  idText,
  initialText,
  onSearch,
  onTextFilter,
}: UseSearchFormParams) => {
  const timeoutId = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchText, setSearchText] = useState(initialText ?? '');

  // La URL manda (atrás/adelante): refleja el texto en el estado
  useEffect(() => {
    setSearchText(initialText ?? '');
  }, [initialText]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    // El target es el elemento que cambió (el input de texto, no el form)
    if (
      event.target instanceof HTMLInputElement &&
      event.target.name === idText
    ) {
      return; // ya lo manejamos en onChange
    }

    const filters: JobFilters = {
      technology: getFilterValue(formData, idTechnology),
      location: getFilterValue(formData, idLocation),
      experienceLevel: getFilterValue(formData, idExperienceLevel),
    };

    onSearch(filters);
  };

  const handleTextChange = (event: ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value;
    setSearchText(text); // actualizamos el input inmediatamente

    // Debounce: Cancelar el timeout anterior
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
    }

    timeoutId.current = setTimeout(() => {
      onTextFilter(text);
    }, 500);
  };

  const clearSearch = () => {
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
    }
    setSearchText('');
  };

  return {
    searchText,
    handleSubmit,
    handleTextChange,
    clearSearch,
  };
};

interface SearchFormSectionProps {
  initialFilters: JobFilters;
  onTextFilter: (text: string) => void;
  onSearch: (filters: JobFilters) => void;
  initialText: string;
}

export function SearchFormSection({
  initialFilters,
  onTextFilter,
  onSearch,
  initialText,
}: SearchFormSectionProps) {
  const idText = useId();
  const idTechnology = useId();
  const idLocation = useId();
  const idExperienceLevel = useId();

  const inputRef = useRef<HTMLInputElement>(null);

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    technologies: [],
    locations: [],
  });

  // Opciones de tecnología/ubicación desde la DB: una sola petición y los
  // selects muestran exactamente lo que hay (sin listas hardcodeadas).
  useEffect(() => {
    const controller = new AbortController();

    async function loadOptions() {
      try {
        const response = await fetch(`${API_URL}/jobs/options`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        setFilterOptions(await response.json());
      } catch {
        // Red caída o desmontaje: los selects quedan con el placeholder
      }
    }

    loadOptions();

    return () => controller.abort();
  }, []);

  // La URL manda (atrás/adelante): refleja el texto en el input no controlado
  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== (initialText ?? '')) {
      inputRef.current.value = initialText ?? '';
    }
  }, [initialText]);

  const { searchText, handleSubmit, handleTextChange, clearSearch } =
    useSearchForm({
      idTechnology,
      idLocation,
      idExperienceLevel,
      idText,
      initialText,
      onSearch,
      onTextFilter,
    });

  const handleClearInput = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (inputRef.current) {
      inputRef.current.value = '';
    }
    clearSearch();
    onTextFilter('');
  };

  return (
    <section className="jobs-search">
      <h1>Encuentra tu próximo trabajo</h1>
      <p>Explora miles de oportunidades en el sector tecnológico.</p>

      {/* biome-ignore-start lint/a11y/useSemanticElements: role=search en <form> es el patron ARIA vigente */}
      <form
        onChange={handleSubmit}
        onSubmit={(event) => event.preventDefault()}
        id="empleos-search-form"
        role="search"
      >
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
            <button
              type="button"
              className="icon-btn"
              onClick={handleClearInput}
              aria-label="Limpiar búsqueda"
            >
              <X size={18} />
            </button>
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
            {filterOptions.technologies.map((technology) => (
              <option key={technology} value={technology}>
                {formatTechnology(technology)}
              </option>
            ))}
          </select>

          <select
            name={idLocation}
            id="filter-location"
            defaultValue={initialFilters.location}
          >
            <option value="">Ubicación</option>
            {filterOptions.locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>

          <select
            name={idExperienceLevel}
            id="filter-experience-level"
            defaultValue={initialFilters.experienceLevel}
          >
            <option value="">Nivel de experiencia</option>
            {Object.entries(JOB_LEVELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </form>
      {/* biome-ignore-end lint/a11y/useSemanticElements: role=search en <form> es el patron ARIA vigente */}

      <span id="filter-selected-value"></span>
    </section>
  );
}
