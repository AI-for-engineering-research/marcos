# Reflections for Week 6 (July 13 - July 17)

- I started using backlog.md for tracking Tasks in my pyEPM repo - this has been a huge upgrade in my workflow.
- Backlog neatly tracks tasks and its outcomes and logs the learning and changes made so its easy to look back and introduce context to follow up sessions.
- Started doing work on computational robustness of my codebase.
- Some things were worrying me, namely: (1) hardcoded time-step series could become a problem in some setups, as microphysics timescales change depending on input parameters, (2) logged some diverging oscillations in the water feedback when simulating past t=1s, (3) sulfur ice number kept substantially increasing even when RHi ~ 1.0 after the initial nucleation burst. This last one is the main issue for me, indicates a bug that increasing timesteps won't resolve.
- Decomposed different components to understand and visualize what is happening with ice particles from different populations (images/task21_3_ice_decomposition.png).
- Fixed the problem, some sulfur aerosol where activating but not evaporating when water vapor went below saturation levels (images/task26_phantom_reset_fixed_T215_RHi120.png).
- Developed adapting time stepping scheme, actively adapts timestep to capture stiff physics, instead of using univeral time series. Currently testing.
- Identified ice nucleation sensitivity to timestep (dt) - need to define a convergence criteria.
