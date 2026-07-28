# Reflections for Week 6 (July 20 - July 24)

- Something I've been meaning to do for a while is compare my model to measured ice particle numbers from flight campaigns, including uncertainties of the physics parameters that are difficult to fit.
- This is quite a detailed mini project, in a claude session I detailed what I wanted - a tab in my research portfolio repo showing the "uncertainties" of my model along with plotting measured flight campaigns.
- I already expected that this plot required running thousands of cases, so I leveraged resources from hex (until we have them..).
- With the task instructions I asked claude to /grill-with-docs. 
- What followed was a series of questions (grilling) from claude to scope the mini project, define the parameter space, etc.
- See the transcript here (docs/transcripts/2026-07-27_6d-uncertainty-campaign-and-envelope-explorer.md). Through the grilling session I hadnt close a previous task that was flagging a bug that was already taken care of. This was my bad on my part, but cleared this out with the agent.
- First pass looks really good, just small tweaks here and there on the structure of the uncertainty tab.
- There are some cases I had to rerun due to accidentally timing them out before they had a chance to finish in slurm, but I asked claude to setup the visualization regardless until I finish rerunning them.
