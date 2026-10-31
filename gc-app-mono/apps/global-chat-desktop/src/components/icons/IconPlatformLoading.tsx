import { FC, memo } from "react";
import { useLoadingProgress } from "@/components/icons/hooks";
import { AppState, ELoadingStatus } from "@gc/model";

export const IconPlatformLoading: FC<Pick<AppState, "loadingStatus">> = memo(
  ({ loadingStatus = ELoadingStatus.none }) => {
    useLoadingProgress(loadingStatus);
    return (
      <svg
        width="158"
        height="158"
        viewBox="0 0 158 158"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g clipPath="url(#clip0_258_8828)">
          <rect width="158" height="158" rx="79" fill="white" />
          <g id="waveGroupContainer">
            <g id="waveGroup">
              <path
                d="M264 65.7716L246.92 74.1877C215.37 89.7865 178.669 89.7865 147.19 74.1877L130.11 65.6991C98.5606 50.1003 61.859 50.1003 30.3804 65.6991L13.3 74.1877C-18.2492 89.7865 -54.9508 89.7865 -86.4294 74.1877L-103.51 65.6991C-135.059 50.1003 -171.761 50.1003 -203.239 65.6991L-220.32 74.1877C-251.869 89.7865 -288.57 89.7865 -320.049 74.1877L-337.129 65.6991C-368.749 50.1003 -405.451 50.1003 -437 65.7716V288H264V65.7716Z"
                fill="url(#paint0_linear_258_8828)"
              />
              <path
                d="M158 65.7716L140.92 74.1877C109.37 89.7865 72.6688 89.7865 41.1902 74.1877L24.1098 65.6991C-7.43942 50.1003 -44.141 50.1003 -75.6196 65.6991L-92.7 74.1877C-124.249 89.7865 -160.951 89.7865 -192.429 74.1877L-209.51 65.6991C-241.059 50.1003 -277.761 50.1003 -309.239 65.6991L-326.32 74.1877C-357.869 89.7865 -394.57 89.7865 -426.049 74.1877L-443.129 65.6991C-474.749 50.1003 -511.451 50.1003 -543 65.7716V288H158V65.7716Z"
                fill="url(#paint1_linear_258_8828)"
              />
              <path
                d="M158 65.7716L140.92 74.1877C109.37 89.7865 72.6688 89.7865 41.1902 74.1877L24.1098 65.6991C-7.43942 50.1003 -44.141 50.1003 -75.6196 65.6991L-92.7 74.1877C-124.249 89.7865 -160.951 89.7865 -192.429 74.1877L-209.51 65.6991C-241.059 50.1003 -277.761 50.1003 -309.239 65.6991L-326.32 74.1877C-357.869 89.7865 -394.57 89.7865 -426.049 74.1877L-443.129 65.6991C-474.749 50.1003 -511.451 50.1003 -543 65.7716V288H158V65.7716Z"
                fill="url(#paint2_radial_258_8828)"
              />
              <path
                d="M158 65.7716L140.92 74.1877C109.37 89.7865 72.6688 89.7865 41.1902 74.1877L24.1098 65.6991C-7.43942 50.1003 -44.141 50.1003 -75.6196 65.6991L-92.7 74.1877C-124.249 89.7865 -160.951 89.7865 -192.429 74.1877L-209.51 65.6991C-241.059 50.1003 -277.761 50.1003 -309.239 65.6991L-326.32 74.1877C-357.869 89.7865 -394.57 89.7865 -426.049 74.1877L-443.129 65.6991C-474.749 50.1003 -511.451 50.1003 -543 65.7716V288H158V65.7716Z"
                fill="url(#paint3_radial_258_8828)"
                fillOpacity="0.46"
              />
            </g>
          </g>

          <mask
            id="path-5-outside-1_258_8828"
            maskUnits="userSpaceOnUse"
            x="49.8379"
            y="51.8008"
            width="57"
            height="55"
            fill="black"
          >
            <rect fill="white" x="49.8379" y="51.8008" width="57" height="55" />
            <path d="M102.485 55.2674C101.207 53.9736 99.3161 53.4917 97.5528 53.999L56.4346 65.7948C54.5742 66.3047 53.2555 67.7684 52.9003 69.6278C52.5374 71.5202 53.8049 73.9224 55.4609 74.927L68.3177 82.7223C69.6364 83.5214 71.3383 83.321 72.4295 82.2353L87.1519 67.6212C87.893 66.8602 89.1196 66.8602 89.8607 67.6212C90.6018 68.3569 90.6018 69.5491 89.8607 70.3102L75.1128 84.9268C74.0191 86.0099 73.8146 87.6969 74.6196 89.0058L82.4753 101.816C83.3953 103.338 84.9797 104.201 86.7174 104.201C86.9219 104.201 87.1519 104.201 87.3563 104.175C89.3496 103.922 90.934 102.577 91.5218 100.675L103.712 60.1633C104.248 58.4383 103.763 56.5611 102.485 55.2674Z" />
          </mask>
          <g filter="url(#filter0_f_258_8828)">
            <ellipse
              cx="79"
              cy="162"
              rx="58"
              ry="47"
              fill="#33FFEB"
              fillOpacity="0.69"
            />
          </g>
          <g filter="url(#filter1_f_258_8828)">
            <ellipse
              cx="38"
              cy="-6"
              rx="58"
              ry="47"
              fill="#BDEDFF"
              fillOpacity="0.39"
            />
          </g>
          <path
            d="M26.8786 42.7023C31.4195 36.2811 37.1405 30.7825 43.7365 26.4997"
            stroke="white"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M51.8793 22.0414C54.0092 21.0748 56.1921 20.2296 58.4175 19.5097"
            stroke="white"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
        <rect
          x="0.5"
          y="0.5"
          width="157"
          height="157"
          rx="78.5"
          stroke="#1F75FF"
        />
        <defs>
          <filter
            id="filter0_f_258_8828"
            x="-24.2"
            y="69.8"
            width="206.4"
            height="184.4"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend
              mode="normal"
              in="SourceGraphic"
              in2="BackgroundImageFix"
              result="shape"
            />
            <feGaussianBlur
              stdDeviation="22.6"
              result="effect1_foregroundBlur_258_8828"
            />
          </filter>
          <filter
            id="filter1_f_258_8828"
            x="-65.2"
            y="-98.2"
            width="206.4"
            height="184.4"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend
              mode="normal"
              in="SourceGraphic"
              in2="BackgroundImageFix"
              result="shape"
            />
            <feGaussianBlur
              stdDeviation="22.6"
              result="effect1_foregroundBlur_258_8828"
            />
          </filter>
          <linearGradient
            id="paint0_linear_258_8828"
            x1="-437"
            y1="98.3468"
            x2="264"
            y2="98.3468"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#6CE7FC" />
            <stop offset="0.54" stopColor="#1F5FFF" />
            <stop offset="1" stopColor="#6CE7FC" />
          </linearGradient>
          <linearGradient
            id="paint1_linear_258_8828"
            x1="-543"
            y1="98.3468"
            x2="158"
            y2="98.3468"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0.5" stopColor="#6CE7FC" />
          </linearGradient>
          <radialGradient
            id="paint2_radial_258_8828"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(-146 100.5) rotate(179.967) scale(397 473.628)"
          >
            <stop stopColor="#2263FF" stopOpacity="0" />
            <stop offset="1" stopColor="#2263FF" />
          </radialGradient>
          <radialGradient
            id="paint3_radial_258_8828"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(-192.5 171) scale(350.5 117)"
          >
            <stop stopColor="#69E1FD" />
            <stop offset="1" stopColor="#6AE3FB" stopOpacity="0" />
          </radialGradient>
          <clipPath id="clip0_258_8828">
            <rect width="158" height="158" rx="79" fill="white" />
          </clipPath>
        </defs>
      </svg>
    );
  },
);
