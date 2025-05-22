import { Component } from 'solid-js';

type LoadingSpinnerProps = {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullScreen?: boolean;
};

const sizeMap = {
  sm: 'h-6 w-6 border-b-2',
  md: 'h-8 w-8 border-b-2',
  lg: 'h-12 w-12 border-b-2',
  xl: 'h-16 w-16 border-b-4',
};

const LoadingSpinner: Component<LoadingSpinnerProps> = (props) => {
  const size = () => props.size || 'lg';
  const spinnerSize = () => sizeMap[size()] || sizeMap.lg;
  
  return (
    <div class={`flex items-center justify-center ${props.fullScreen !== false ? 'min-h-screen' : ''}`}>
      <div class={`animate-spin rounded-full border-primary ${spinnerSize()}`}></div>
    </div>
  );
};

export default LoadingSpinner;
