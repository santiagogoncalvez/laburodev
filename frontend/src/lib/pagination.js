// Paginación acotada estilo GitHub: primera y última siempre visibles,
// hermanos alrededor de la actual, elipsis en los saltos.
// Lógica pura y testeable: no toca DOM ni router.
export function getVisiblePages(currentPage, pageCount, siblingCount = 2) {
   const maxItems = siblingCount * 2 + 5;
   // siblingCount 2: 1 + ellipsis + 5 centrales + ellipsis + 1 = 9

   if (pageCount <= maxItems) {
      return Array.from({ length: pageCount }, (_, i) => i + 1);
   }

   const start = Math.max(currentPage - siblingCount, 1);
   const end = Math.min(currentPage + siblingCount, pageCount);

   const showLeftEllipsis = currentPage > siblingCount + 3;
   const showRightEllipsis = currentPage < pageCount - siblingCount - 2;

   // Inicio
   if (!showLeftEllipsis) {
      const visibleCount = maxItems - 2;
      // quitamos: ellipsis + última página
      const pages = [];
      for (let i = 1; i <= visibleCount; i++) {
         pages.push(i);
      }
      pages.push("ellipsis");
      pages.push(pageCount);
      return pages;
   }

   // Final
   if (!showRightEllipsis) {
      const visibleCount = maxItems - 2;
      const pages = [1, "ellipsis"];
      const from = pageCount - visibleCount + 1;
      for (let i = from; i <= pageCount; i++) {
         pages.push(i);
      }
      return pages;
   }

   // Centro
   const pages = [1, "ellipsis"];
   for (let i = start; i <= end; i++) {
      pages.push(i);
   }
   pages.push("ellipsis");
   pages.push(pageCount);
   return pages;
}
