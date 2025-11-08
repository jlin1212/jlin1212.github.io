from PIL import Image, ImageDraw, ImageFont
import numpy as np
import matplotlib.pyplot as plt
import networkx as nx

width = 500
height = 250

img = Image.new('RGB', (width, height), color='white')
d = ImageDraw.Draw(img)

fnt = ImageFont.truetype('cmunrm.ttf', 40)
d.text((width / 2, height / 2), 'Self-Organized Criticality', font=fnt, fill=(0, 0, 0), anchor='mm')

img = (255 - np.array(img)[:,:,0]) / 255.
img = np.where(img > 0.5, 1, 0)

# plt.imshow(img)
# plt.show()

dot_pos = np.argwhere(img)
dot_pos = np.flip(dot_pos, axis=1)
dot_pos = dot_pos / np.array([width, height])[None,...]
print(dot_pos.shape)
np.savetxt('titles/criticality.txt', dot_pos, fmt='%f')

# brain_graph = nx.balanced_tree(2, 3)
# brain_graph_pos = nx.kamada_kawai_layout(brain_graph)
# brain_graph_directed = nx.traversal.bfs_tree(brain_graph, 8)
# with open('assets/brain_graph_bfs.txt', 'w') as brain_graph_bfs:
#     for distance in range(7):
#         at_dist = nx.traversal.descendants_at_distance(brain_graph, 8, distance)
#         for n in at_dist: brain_graph_bfs.write(f'{n}: {distance}\n')
# nx.write_adjlist(brain_graph_directed, 'assets/brain_graph_adj.txt')
# np.savetxt('assets/brain_graph.txt', np.array(list(brain_graph_pos.values())), fmt='%f')
# nx.draw_networkx(brain_graph, pos=brain_graph_pos)
# plt.show()

seizure_graph = nx.powerlaw_cluster_graph(60, 2, 0.1)
seizure_graph_pos = nx.kamada_kawai_layout(seizure_graph)
seizure_graph_directed = nx.traversal.bfs_tree(seizure_graph, 8)
with open('assets/seizure_graph_bfs.txt', 'w') as seizure_graph_bfs:
    for distance in range(7):
        at_dist = nx.traversal.descendants_at_distance(seizure_graph, 8, distance)
        for n in at_dist: seizure_graph_bfs.write(f'{n}: {distance}\n')
nx.write_adjlist(seizure_graph_directed, 'assets/seizure_graph_adj.txt')
np.savetxt('assets/seizure_graph.txt', np.array(list(seizure_graph_pos.values())), fmt='%f')
nx.draw_networkx(seizure_graph, pos=seizure_graph_pos)
plt.show()
