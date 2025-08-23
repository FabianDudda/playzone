- 


-------------------------------------------------------------------------------

     │ Map Performance Optimization Plan                                 │
     │                                                                   │
     │ Phase 1: Core Performance Improvements                            │
     │                                                                   │
     │ 1. Implement marker pooling and reuse system                      │
     │   - Create marker object pool to avoid recreation                 │
     │   - Reuse markers when filtering instead of destroying/recreating │
     │   - Add marker state management                                   │
     │ 2. Optimize custom icons                                          │
     │   - Replace heavy HTML icons with lightweight SVG data URIs       │
     │   - Reduce CSS complexity in marker icons                         │
     │   - Cache icon generation results                                 │
     │ 3. Add viewport-based loading                                     │
     │   - Only load markers within current map bounds + buffer          │
     │   - Implement bounds-based data fetching                          │
     │   - Add lazy loading for markers outside viewport                 │
     │                                                                   │
     │ Phase 2: Data & State Optimizations                               │
     │                                                                   │
     │ 4. Implement intelligent caching                                  │
     │   - Cache filtered results by filter combination                  │
     │   - Add memoization for expensive calculations                    │
     │   - Optimize React Query cache strategy                           │
     │ 5. Optimize re-render behavior                                    │
     │   - Use React.memo for marker components                          │
     │   - Implement proper dependency arrays                            │
     │   - Reduce unnecessary map updates                                │
     │                                                                   │
     │ Phase 3: Advanced Optimizations                                   │
     │                                                                   │
     │ 6. Add debounced filtering                                        │
     │   - Debounce search input and filter changes                      │
     │   - Batch multiple filter updates                                 │
     │   - Smooth user interactions                                      │
     │ 7. Implement progressive loading                                  │
     │   - Load markers in chunks based on zoom level                    │
     │   - Higher zoom = more detailed markers                           │
     │   - Lower zoom = simplified cluster visualization                 │
     │ 8. Add performance monitoring                                     │
     │   - Track render times and marker counts                          │
     │   - Monitor memory usage                                          │
     │   - Add development performance warnings                          │
     │                                                                   │
     │ Expected Results                                                  │
     │                                                                   │
     │ - 50-70% reduction in initial load time                           │
     │ - 60-80% faster filter operations                                 │
     │ - 40-60% less memory usage                                        │
     │ - Smooth interactions even with 1000+ markers 

------------------------------------------
------------------------------------------
------------------------------------------

"map pin: change design for multiple sports at one place"


Change the map pin design as following:

# Icons layout:
- Show the sport icons horizontally, side by side within the pin.
- If there are 5 or fewer sports, display all icons.
- If there are more than 5 sports, display the first 4 icons and a fifth circle showing “+X”, where X is the number of remaining sports.

# Pin shape:
- Keep a consistent background shape (e.g., round or teardrop).
- Icons should fit neatly inside the pin without overlapping the edges.

# Icon size:
- Maintain uniform size for all icons for visual clarity.

# “+X” indicator:
- Circle with contrasting background color.
- White or high-contrast text for readability.

------------------------------------------
------------------------------------------
------------------------------------------

# Places editierbar machen / bzw. Fehler melden (Korrigierte Fassung schicken)

- User können Daten bearbeiten (zB bei courts: sport, anzahl, boden usw. //  bei places: adress, location usw.)
- User können Daten hinzufügen oder löschen
- Bevor Daten gespeichert werden, müssen diese von Admin überprüft werden

----------------------------------------------------------------------------------------------------------------------

# Icons für Map Pins

- welches Icon bei Plätzen mit mehreren Sportarten?

--------------------

