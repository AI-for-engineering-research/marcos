# Reflections for Week 4 (June 29 - July 3)

- Using the now predicted distributions from the ion-mediated nucleation model (IMN), I am going ahead and running a comparison with Yu's ACM results from 2024 based on ECLIF campaign fuel and engine conditions.
- The agent helped me extract only the data I needed from hex to analyze locally (developed a quick script to run there). My current runs are getting quite heavy so this was useful.
- Results look qualitately good. I noticed I inadvertdly reduced the number of bins in the volatile distribution and my results show a "laddering" effect (show images/karcher_fig3_yu2024.png).
- I initially was going to stick with this implementation of the IMN. I got stubborn and went forward implementing the latest version of the model (new thermodynamics approach as of Yu et. al 2024).
- The agent helped extracting data from relevant sources, implementing and coupling the model, all while keeping the codebase consistent and re-running the test suite after every new implementation.
- Older IMN model was kept as a separate mode I could run pyEPM in.
- A decomposition analysis (separating neutral from charged volatile clusters) showed that the neutral pathway was unphysically dominating the charged path. We expect bimodal distributions from these runs (show images/fig3_components.png).
- Initially thought I needed more data, but a re-read of Yu2018 showed an useful interpolation that wasn't caught by the agent. This could be critical.
