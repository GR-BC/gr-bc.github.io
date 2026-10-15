/** Edit timing, accents, and descriptive copy here. Geometry lives in framework.svg. */
export const frameworkConfig = {
  cycleDuration: 12,
  speed: 1,
  autoplay: true,
  stages: {
    A: {label:'Build the goal-reachability graph', color:'#79b7c8', description:'Mixed offline data, multi-view state representations, and conservative graph connections.'},
    B: {label:'Estimate remaining steps', color:'#d1a15c', description:'Remaining-step estimation and interpolation along the observed trajectories.'},
    C: {label:'Reweight behavior cloning', color:'#df9b7f', description:'Consequence-based weights determine the contribution of observed action chunks.'},
    D: {label:'Roll out, intervene, repeat', color:'#94ad7c', description:'Real-world rollouts and human interventions return to the offline dataset.'}
  },
  componentDescriptions: {
    'a-data-demo':'离线演示数据入口。轮廓、容器和说明作为一组控制。',
    'a-data-intervention':'人工介入与恢复数据入口，与演示和 replay 数据共同构成混合数据。',
    'a-data-replay':'策略 rollout / replay 数据入口。',
    'a-gripper':'状态表示中的 gripper-state 组件，可整体移动、缩放或隐藏。',
    'a-goal':'图中的目标 / 成功终点，保留原图的标记和旗帜。',
    'c-vla':'加权监督训练中的 VLA 组件。',
    'c-objective':'GR-BC 训练目标，公式按原始轮廓保留。',
    'd-human-operator':'真实世界的人类介入环节。'
  },
  typeDescriptions: {
    'temporal-edge':'原图中的时序连接。关联列表指向图中相连的两个节点。',
    'similarity-edge':'原图中的相似度连接。关联关系来自图形端点位置。',
    'node-demo':'演示数据节点。可高亮关联的图连接。',
    'node-replay':'Replay 数据节点。可高亮关联的图连接。',
    'node-intervention':'人工介入数据节点。可高亮关联的图连接。',
    'node-failure':'原图中标记为失败的节点。',
    'camera':'原图中的图像组件；裁切方式保持一致。',
    'weight':'一个完整的训练权重柱，填充和边框一起控制。',
    'progress-point':'原图加权轨迹曲线上的一个采样点。',
    'remaining-point':'原图剩余步数曲线上的一个采样点。',
    'connector':'阶段之间或模块内部的连接元素。',
    'title':'阶段标题、色条与字母徽标，作为一组控制。'
  },
  routes: [
    {from:'A',to:'B',d:'M 979 171 C 1016 121 1028 100 1065 111 S 1162 145 1220 141'},
    {from:'B',to:'C',d:'M 1379 423 L 1379 482'},
    {from:'C',to:'D',d:'M 890 631 L 813 631'},
    {from:'D',to:'A',d:'M 116 478 L 116 405'}
  ]
};
