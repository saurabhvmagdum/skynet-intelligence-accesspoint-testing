// accesspoints.ts
import { AccessPoint } from './types';


export const accessPointsData: AccessPoint[] = [
  {
    id: "runpod-management",
    subnetID: "3",
    subnetName: "runpod",
    description: "This is for creating and managing RunPod instances",
    input: "Only prompt",
    output: "Pod details",
    inputType: "text",
    outputType: "json",
    capabilities: ["manage-pod", "create-pod"],
    tags: ["runpod", "pod", "management"],
    promptExample:
      "Create a new pod name: 'RunPod Tensorflow' imageName: 'runpod/pytorch' ports: 8888/http volume: /workspace",
    fileUpload: false,
    fileDownload: false,
    subnetURL: "https://runpodservice-c0n1.stackos.io/natural-request",
  },
  {
    id: "image-execution",
    subnetID: "19",
    subnetName: "runpod",
    description: "This is for creating and managing image instances",
    input: "Only prompt",
    output: "Pod details",
    inputType: "text",
    outputType: "json",
    capabilities: ["manage-pod", "create-pod"],
    tags: ["runpod", "pod", "management"],
    promptExample:
      "Create a new pod name: 'RunPod Tensorflow' imageName: 'runpod/pytorch' ports: 8888/http volume: /workspace",
    fileUpload: false,
    fileDownload: false,
    subnetURL: "https://runpodservice-c0n1.stackos.io/natural-request",
  },
  {
    id: "audio-accesspoint",
    subnetID: "20",
    subnetName: "runpod",
    description: "This is for audio transcription and summarization",
    input: "Audio file",
    output: "Transcription and summary",
    inputType: "file",
    outputType: "text",
    capabilities: ["manage-pod", "create-pod"],
    tags: ["runpod", "pod", "management"],
    promptExample:
      "Create a new pod name: 'RunPod Tensorflow' imageName: 'runpod/pytorch' ports: 8888/http volume: /workspace",
    fileUpload: false,
    fileDownload: false,
    subnetURL: "https://runpodservice-c0n1.stackos.io/natural-request",
  },
  {
    id: "video-accesspoint",
    subnetID: "9",
    subnetName: "runpod",
    description: "This is for audio transcription and summarization",
    input: "Audio file",
    output: "Transcription and summary",
    inputType: "file",
    outputType: "text",
    capabilities: ["manage-pod", "create-pod"],
    tags: ["runpod", "pod", "management"],
    promptExample:
      "Create a new pod name: 'RunPod Tensorflow' imageName: 'runpod/pytorch' ports: 8888/http volume: /workspace",
    fileUpload: false,
    fileDownload: false,
    subnetURL: "https://runpodservice-c0n1.stackos.io/natural-request",
  },
  {
    id: "creation-openai",
    subnetID: "23",
    subnetName: "runpod",
    description: "This is for creating and managing image instances",
    input: "Only prompt",
    output: "Pod details",
    inputType: "text",
    outputType: "json",
    capabilities: ["manage-pod", "create-pod"],
    tags: ["runpod", "pod", "management"],
    promptExample:
      "Create a new pod name: 'RunPod Tensorflow' imageName: 'runpod/pytorch' ports: 8888/http volume: /workspace",
    fileUpload: false,
    fileDownload: false,
    subnetURL: "https://runpodservice-c0n1.stackos.io/natural-request",
  },
   {
    id: "subnet-accesspoint",
    subnetID: "24",
    subnetName: "runpod",
    description: "This is for creating and managing image instances",
    input: "Only prompt",
    output: "Pod details",
    inputType: "text",
    outputType: "json",
    capabilities: ["manage-pod", "create-pod"],
    tags: ["runpod", "pod", "management"],
    promptExample:
      "Create a new pod name: 'RunPod Tensorflow' imageName: 'runpod/pytorch' ports: 8888/http volume: /workspace",
    fileUpload: false,
    fileDownload: false,
    subnetURL: "https://runpodservice-c0n1.stackos.io/natural-request",
  },
  {
    id: "3dauto-accesspoint",
    subnetID: "4",
    subnetName: "runpod",
    description: "This is for creating and managing 3d image instances",
    input: "Only prompt",
    output: "Pod details",
    inputType: "text",
    outputType: "json",
    capabilities: ["manage-pod", "create-pod"],
    tags: ["runpod", "pod", "management"],
    promptExample:
      "Create a new pod name: 'RunPod Tensorflow' imageName: 'runpod/pytorch' ports: 8888/http volume: /workspace",
    fileUpload: false,
    fileDownload: false,
    subnetURL: "https://runpodservice-c0n1.stackos.io/natural-request",
  }

  // Add more access points here...
];



// Helper function to get access point by ID
export const getAccessPointById = (id: string): AccessPoint | undefined => {
  return accessPointsData.find(ap => ap.id === id);
};

// Helper function to get access points by subnet
export const getAccessPointsBySubnet = (subnetName: string): AccessPoint[] => {
  return accessPointsData.filter(ap => ap.subnetName === subnetName);
};

// Helper function to get access points by capability
export const getAccessPointsByCapability = (capability: string): AccessPoint[] => {
  return accessPointsData.filter(ap => ap.capabilities.includes(capability));
};

// Helper function to get access points by tag
export const getAccessPointsByTag = (tag: string): AccessPoint[] => {
  return accessPointsData.filter(ap => ap.tags.includes(tag));
};

