# Reflections and comments for Week 2 (June 15 - 18)

- I am starting to use the Pi agent for my actual work now.
- On my research code repo for pyEPM, I added an AGENTS.md file for the context of that work. I'll be using Pi as a "computational physics" coworker.
- Based on suggestions, and to "test" the agents understanding of my model, I asked it the develop a flowchart of pyEPM, including input parameters, initialization, driving equations, and how the physics are coupled.
- Used CPT 5.4. First pass looked alright, although it implied that the kinetic nucleation model was also driving particle growth through condensation. This is a bit of a misconception - particles do grow by coagulation, but condensation is a separate mechanism.
- Tweaked the panel a bit - at first it was designed inconveniently, I had to scroll up and down between steps of the flowchart. I fixed this by having both the left panel (with step selection) and right panel (description and equations) be scrollable.
- Next big thing: Sensitivity tab.
- Essentially what I want to do now is a prototype of what I want my regression model to look like. I am asking the agent how I can use my model to plot results given some modified parameters that the user can input through "sliders". For starters, I'll have fsc, ambient temperature, initial dilution, and soot EI sliders.
- Agent gave two options: pyodide (which is effectively solving my model at the moment) or run a 4D pyEPM cube in which to develop a precomputed lookup table.
- Asked for a parameter sweep to run on hex - running on serial in my computer would have taken hours.
- Initial test was too large for a single batch so reduced the number to 600 grid points for now.
- First pass was super rough - sliders on top of each other, plot titles hardly visible. Iterated for a bit the UI, it looks pretty good now.
- Okay playing around a bit with the sliders I notice that the temperature interpolation is doing some funky stuff. The agent used multi-linear interpolation to develop the lookup table. It seems that this model is not good for the temperature sliders as this shifts the nucleation timescale significantly. The interpolation struggles to capture this with the low resolution I gave it:
