# Reflections for Week 3 (June 22 - 27)

## June 18

- I am moving away a bit from working on the sensitivity visualization tool and started working on some lingering validation work for pyEPM.
- In particular, test cases I have done until now assume a prescribed volatile aerosol distribution. While useful for sensitivity studies, it is not physically accurate. I am implementing a model to capture aerosol nucleation and growth given initial fuel sulfur content, ion emission index, and plume thermodynamic trajectory.
- I had previously done a poor manual attempt at this. I am feeding the agent the reference paper for the ion mediation nucleation (IMN) model, by Yu (2006).
- The agent found that while my implementation was qualitatively similar, there were many inconsistencies with Yu's model (bugs in the molecular bin definition of the collision scheme, lack of thermodynamic stability parameters for evaporation).
- Instead building upon what I had, the agent developed a standalone of the IMN for benchmarking, which was then coupled/bridged to pyEPM microphysics.
- I made sure to ask for a test suite for the standalone IMN. These evolved as the IMN was coupled to pyEPM.
- Initial runs were very slow - one full case was ~10 mins. This is not efficient for testing, I asked the agent to reduce computational costs without affcting the physics. The test suite was useful for this.
- The agent vectorized loops and masked empty bins (it was applying some physics relation to bins even when empty). This drastically reduced computing time, from ~10 mins to ~50 s.

## June 19 - 22

- Full pyEPM results and predicted vPM distributions were not matching well with Yu et al (2024). The target model comparison is also a full microphysics model. I proceeded by first calibrating the other microphysics so I can isolate the IMN.
- The paper reports temperature and humidity trajectories - I used these to calibrate entrainment and dilution parameters, assuming they are using the same relations from Karcher (2015): (show this plot in pyEPM/outputs/diagnostics/yu2024_fig1a_temperature_panels.png).
- The agent struggled a bit with extracting data from these plots (many colors hard to distinguish when lines overlap). I worked mostly with Cases 2 and 6.
- Once calibrated, next step is to compare distributions at the same timestamps. They state the distributions showed are right before RH = 100%.
- What followed was a back and forth between me and the agent: Agent attempts to find bugs/inconsistencies - I addressed possible issues reported by agent - Agent made fixes - I replotted the comparison, results got closer but still off - rinse and repeat.
- What I noticed was that many inconsistencies stemmed from the agent making approximations when there was a lack of information in the paper, or certain aspects of the model were outsourced to another paper.
- I made the agent ask me for additional literature whenever it lacked the informations. This went really well. My aerosol distributions follow very closely the reported distributions in Yu et al (2024). There are still some differences, but I will continue working on these (show pyEPM/outputs/diagnostics/yu2024_fig3_case2_case6_yu2007_sconv15_volatile_comparison.png)
