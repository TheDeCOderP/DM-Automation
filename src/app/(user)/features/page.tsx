"use client"
import Image from "next/image"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  CheckCircle2, 
  Hourglass, 
  Clock, 
  Image as ImageIcon, 
  PlaySquare, 
  FileText,
  CalendarDays, 
  BarChart3, 
  ShieldCheck, 
  FolderSync, 
  TriangleIcon
} from "lucide-react"
import { cn } from "@/lib/utils"

// --- CUSTOM SVG ICONS ---
const TwitterIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 256 209" preserveAspectRatio="xMidYMid" {...props}><path d="M256 25.45c-9.42 4.177-19.542 7-30.166 8.27 10.845-6.5 19.172-16.793 23.093-29.057a105.183 105.183 0 0 1-33.351 12.745C205.995 7.201 192.346.822 177.239.822c-29.006 0-52.523 23.516-52.523 52.52 0 4.117.465 8.125 1.36 11.97-43.65-2.191-82.35-23.1-108.255-54.876-4.52 7.757-7.11 16.78-7.11 26.404 0 18.222 9.273 34.297 23.365 43.716a52.312 52.312 0 0 1-23.79-6.57c-.003.22-.003.44-.003.661 0 25.447 18.104 46.675 42.13 51.5a52.592 52.592 0 0 1-23.718.9c6.683 20.866 26.08 36.05 49.062 36.475-17.975 14.086-40.622 22.483-65.228 22.483-4.24 0-8.42-.249-12.529-.734 23.243 14.902 50.85 23.597 80.51 23.597 96.607 0 149.434-80.031 149.434-149.435 0-2.278-.05-4.543-.152-6.795A106.748 106.748 0 0 0 256 25.45" fill="#55acee"/></svg>
)

const LinkedinIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg preserveAspectRatio="xMidYMid" viewBox="0 0 256 256" {...props}><path d="M218.123 218.127h-37.931v-59.403c0-14.165-.253-32.4-19.728-32.4-19.756 0-22.779 15.434-22.779 31.369v60.43h-37.93V95.967h36.413v16.694h.51a39.907 39.907 0 0 1 35.928-19.733c38.445 0 45.533 25.288 45.533 58.186l-.016 67.013ZM56.955 79.27c-12.157.002-22.014-9.852-22.016-22.009-.002-12.157 9.851-22.014 22.008-22.016 12.157-.003 22.014 9.851 22.016 22.008A22.013 22.013 0 0 1 56.955 79.27m18.966 138.858H37.95V95.967h37.97v122.16ZM237.033.018H18.89C8.58-.098.125 8.161-.001 18.471v219.053c.122 10.315 8.576 18.582 18.89 18.474h218.144c10.336.128 18.823-8.139 18.966-18.474V18.454c-.147-10.33-8.635-18.588-18.966-18.453" fill="#0A66C2"/></svg>
)

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 666.667 666.667" {...props}><defs><clipPath id="facebook_icon__a" clipPathUnits="userSpaceOnUse"><path d="M0 700h700V0H0Z"/></clipPath></defs><g clipPath="url(#facebook_icon__a)" transform="matrix(1.33333 0 0 -1.33333 -133.333 800)"><path d="M0 0c0 138.071-111.929 250-250 250S-500 138.071-500 0c0-117.245 80.715-215.622 189.606-242.638v166.242h-51.552V0h51.552v32.919c0 85.092 38.508 124.532 122.048 124.532 15.838 0 43.167-3.105 54.347-6.211V81.986c-5.901.621-16.149.932-28.882.932-40.993 0-56.832-15.528-56.832-55.9V0h81.659l-14.028-76.396h-67.631v-171.773C-95.927-233.218 0-127.818 0 0" style={{fill:'#0866ff', fillOpacity:1, fillRule:'nonzero'}} transform="translate(600 350)"/><path d="m0 0 14.029 76.396H-67.63v27.019c0 40.372 15.838 55.899 56.831 55.899 12.733 0 22.981-.31 28.882-.931v69.253c-11.18 3.106-38.509 6.212-54.347 6.212-83.539 0-122.048-39.441-122.048-124.533V76.396h-51.552V0h51.552v-166.242a250.559 250.559 0 0 1 60.394-7.362c10.254 0 20.358.632 30.288 1.831V0Z" style={{fill:'#fff', fillOpacity:1, fillRule:'nonzero'}} transform="translate(447.918 273.604)"/></g></svg>
)

const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 264.583 264.583" {...props}><defs><radialGradient href="#instagram_icon__a" id="instagram_icon__f" cx="158.429" cy="578.088" r="52.352" fx="158.429" fy="578.088" gradientTransform="matrix(0 -4.03418 4.28018 0 -2332.227 942.236)" gradientUnits="userSpaceOnUse"/><radialGradient href="#instagram_icon__b" id="instagram_icon__g" cx="172.615" cy="600.692" r="65" fx="172.615" fy="600.692" gradientTransform="matrix(.67441 -1.16203 1.51283 .87801 -814.366 -47.835)" gradientUnits="userSpaceOnUse"/><radialGradient href="#instagram_icon__c" id="instagram_icon__h" cx="144.012" cy="51.337" r="67.081" fx="144.012" fy="51.337" gradientTransform="matrix(-2.3989 .67549 -.23008 -.81732 464.996 -26.404)" gradientUnits="userSpaceOnUse"/><radialGradient href="#instagram_icon__d" id="instagram_icon__e" cx="199.788" cy="628.438" r="52.352" fx="199.788" fy="628.438" gradientTransform="matrix(-3.10797 .87652 -.6315 -2.23914 1345.65 1374.198)" gradientUnits="userSpaceOnUse"/><linearGradient id="instagram_icon__d"><stop offset="0" stopColor="#ff005f"/><stop offset="1" stopColor="#fc01d8"/></linearGradient><linearGradient id="instagram_icon__c"><stop offset="0" stopColor="#780cff"/><stop offset="1" stopColor="#820bff" stopOpacity="0"/></linearGradient><linearGradient id="instagram_icon__b"><stop offset="0" stopColor="#fc0"/><stop offset="1" stopColor="#fc0" stopOpacity="0"/></linearGradient><linearGradient id="instagram_icon__a"><stop offset="0" stopColor="#fc0"/><stop offset=".124" stopColor="#fc0"/><stop offset=".567" stopColor="#fe4a05"/><stop offset=".694" stopColor="#ff0f3f"/><stop offset="1" stopColor="#fe0657" stopOpacity="0"/></linearGradient></defs><path fill="url(#instagram_icon__e)" d="M204.15 18.143c-55.23 0-71.383.057-74.523.317-11.334.943-18.387 2.728-26.07 6.554-5.922 2.942-10.592 6.351-15.201 11.13-8.394 8.716-13.481 19.439-15.323 32.184-.895 6.188-1.156 7.45-1.209 39.056-.02 10.536 0 24.4 0 42.999 0 55.2.062 71.341.326 74.476.916 11.032 2.645 17.973 6.308 25.565 7 14.533 20.37 25.443 36.12 29.514 5.453 1.404 11.476 2.178 19.208 2.544 3.277.142 36.669.244 70.081.244 33.413 0 66.826-.04 70.02-.203 8.954-.422 14.153-1.12 19.901-2.606 15.852-4.09 28.977-14.838 36.12-29.575 3.591-7.409 5.412-14.614 6.236-25.07.18-2.28.255-38.626.255-74.924 0-36.304-.082-72.583-.26-74.863-.835-10.625-2.656-17.77-6.364-25.32-3.042-6.182-6.42-10.799-11.324-15.519-8.752-8.361-19.455-13.45-32.21-15.29-6.18-.894-7.41-1.158-39.033-1.213z" transform="translate(-71.816 -18.143)"/><path fill="url(#instagram_icon__f)" d="M204.15 18.143c-55.23 0-71.383.057-74.523.317-11.334.943-18.387 2.728-26.07 6.554-5.922 2.942-10.592 6.351-15.201 11.13-8.394 8.716-13.481 19.439-15.323 32.184-.895 6.188-1.156 7.45-1.209 39.056-.02 10.536 0 24.4 0 42.999 0 55.2.062 71.341.326 74.476.916 11.032 2.645 17.973 6.308 25.565 7 14.533 20.37 25.443 36.12 29.514 5.453 1.404 11.476 2.178 19.208 2.544 3.277.142 36.669.244 70.081.244 33.413 0 66.826-.04 70.02-.203 8.954-.422 14.153-1.12 19.901-2.606 15.852-4.09 28.977-14.838 36.12-29.575 3.591-7.409 5.412-14.614 6.236-25.07.18-2.28.255-38.626.255-74.924 0-36.304-.082-72.583-.26-74.863-.835-10.625-2.656-17.77-6.364-25.32-3.042-6.182-6.42-10.799-11.324-15.519-8.752-8.361-19.455-13.45-32.21-15.29-6.18-.894-7.41-1.158-39.033-1.213z" transform="translate(-71.816 -18.143)"/><path fill="url(#instagram_icon__g)" d="M204.15 18.143c-55.23 0-71.383.057-74.523.317-11.334.943-18.387 2.728-26.07 6.554-5.922 2.942-10.592 6.351-15.201 11.13-8.394 8.716-13.481 19.439-15.323 32.184-.895 6.188-1.156 7.45-1.209 39.056-.02 10.536 0 24.4 0 42.999 0 55.2.062 71.341.326 74.476.916 11.032 2.645 17.973 6.308 25.565 7 14.533 20.37 25.443 36.12 29.514 5.453 1.404 11.476 2.178 19.208 2.544 3.277.142 36.669.244 70.081.244 33.413 0 66.826-.04 70.02-.203 8.954-.422 14.153-1.12 19.901-2.606 15.852-4.09 28.977-14.838 36.12-29.575 3.591-7.409 5.412-14.614 6.236-25.07.18-2.28.255-38.626.255-74.924 0-36.304-.082-72.583-.26-74.863-.835-10.625-2.656-17.77-6.364-25.32-3.042-6.182-6.42-10.799-11.324-15.519-8.752-8.361-19.455-13.45-32.21-15.29-6.18-.894-7.41-1.158-39.033-1.213z" transform="translate(-71.816 -18.143)"/><path fill="url(#instagram_icon__h)" d="M204.15 18.143c-55.23 0-71.383.057-74.523.317-11.334.943-18.387 2.728-26.07 6.554-5.922 2.942-10.592 6.351-15.201 11.13-8.394 8.716-13.481 19.439-15.323 32.184-.895 6.188-1.156 7.45-1.209 39.056-.02 10.536 0 24.4 0 42.999 0 55.2.062 71.341.326 74.476.916 11.032 2.645 17.973 6.308 25.565 7 14.533 20.37 25.443 36.12 29.514 5.453 1.404 11.476 2.178 19.208 2.544 3.277.142 36.669.244 70.081.244 33.413 0 66.826-.04 70.02-.203 8.954-.422 14.153-1.12 19.901-2.606 15.852-4.09 28.977-14.838 36.12-29.575 3.591-7.409 5.412-14.614 6.236-25.07.18-2.28.255-38.626.255-74.924 0-36.304-.082-72.583-.26-74.863-.835-10.625-2.656-17.77-6.364-25.32-3.042-6.182-6.42-10.799-11.324-15.519-8.752-8.361-19.455-13.45-32.21-15.29-6.18-.894-7.41-1.158-39.033-1.213z" transform="translate(-71.816 -18.143)"/><path fill="#fff" d="M132.345 33.973c-26.716 0-30.07.117-40.563.594-10.472.48-17.62 2.136-23.876 4.567-6.47 2.51-11.958 5.87-17.426 11.335-5.472 5.464-8.834 10.948-11.354 17.412-2.44 6.252-4.1 13.397-4.57 23.858-.47 10.486-.593 13.838-.593 40.535 0 26.697.119 30.037.594 40.522.482 10.465 2.14 17.609 4.57 23.859 2.515 6.465 5.876 11.95 11.346 17.414 5.466 5.468 10.955 8.834 17.42 11.345 6.26 2.431 13.41 4.088 23.881 4.567 10.493.477 13.844.594 40.559.594 26.719 0 30.061-.117 40.555-.594 10.472-.48 17.63-2.136 23.888-4.567 6.468-2.51 11.948-5.877 17.414-11.345 5.472-5.464 8.834-10.949 11.354-17.412 2.419-6.252 4.079-13.398 4.57-23.858.472-10.486.595-13.828.595-40.525s-.123-30.047-.594-40.533c-.492-10.465-2.152-17.608-4.57-23.858-2.521-6.466-5.883-11.95-11.355-17.414-5.472-5.468-10.944-8.827-17.42-11.335-6.271-2.431-13.424-4.088-23.897-4.567-10.493-.477-13.834-.594-40.558-.594zm-8.825 17.715c2.62-.004 5.542 0 8.825 0 26.266 0 29.38.094 39.752.565 9.591.438 14.797 2.04 18.264 3.385 4.591 1.782 7.864 3.912 11.305 7.352 3.443 3.44 5.575 6.717 7.362 11.305 1.346 3.46 2.951 8.663 3.388 18.247.47 10.363.573 13.475.573 39.71 0 26.233-.102 29.346-.573 39.709-.44 9.584-2.042 14.786-3.388 18.247-1.783 4.587-3.919 7.854-7.362 11.292-3.443 3.441-6.712 5.57-11.305 7.352-3.463 1.352-8.673 2.95-18.264 3.388-10.37.47-13.486.573-39.752.573-26.268 0-29.38-.102-39.751-.573-9.592-.443-14.797-2.044-18.267-3.39-4.59-1.781-7.87-3.911-11.313-7.352-3.443-3.44-5.574-6.709-7.362-11.298-1.346-3.461-2.95-8.663-3.387-18.247-.472-10.363-.566-13.476-.566-39.726s.094-29.347.566-39.71c.438-9.584 2.04-14.786 3.387-18.25 1.783-4.588 3.919-7.865 7.362-11.305 3.443-3.441 6.722-5.57 11.313-7.357 3.468-1.351 8.675-2.949 18.267-3.389 9.075-.41 12.592-.532 30.926-.553zm61.337 16.322c-6.518 0-11.805 5.277-11.805 11.792 0 6.512 5.287 11.796 11.805 11.796 6.517 0 11.804-5.284 11.804-11.796 0-6.513-5.287-11.796-11.805-11.796zm-52.512 13.782c-27.9 0-50.519 22.603-50.519 50.482 0 27.879 22.62 50.471 50.52 50.471s50.51-22.592 50.51-50.471c0-27.879-22.613-50.482-50.513-50.482zm0 17.715c18.11 0 32.792 14.67 32.792 32.767 0 18.096-14.683 32.767-32.792 32.767-18.11 0-32.791-14.671-32.791-32.767 0-18.098 14.68-32.767 32.791-32.767z"/></svg>
)

const YoutubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg preserveAspectRatio="xMidYMid" viewBox="0 0 256 180" {...props}><path fill="red" d="M250.346 28.075A32.18 32.18 0 0 0 227.69 5.418C207.824 0 127.87 0 127.87 0S47.912.164 28.046 5.582A32.18 32.18 0 0 0 5.39 28.24c-6.009 35.298-8.34 89.084.165 122.97a32.18 32.18 0 0 0 22.656 22.657c19.866 5.418 99.822 5.418 99.822 5.418s79.955 0 99.82-5.418a32.18 32.18 0 0 0 22.657-22.657c6.338-35.348 8.291-89.1-.164-123.134Z"/><path fill="#FFF" d="m102.421 128.06 66.328-38.418-66.328-38.418z"/></svg>
)

const TiktokIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg id="tiktok_icon_light__Layer_2" viewBox="0 0 352.28 398.67" {...props}><g id="tiktok_icon_light__Layer_1-2"><path d="M137.17 156.98v-15.56c-5.34-.73-10.76-1.18-16.29-1.18C54.23 140.24 0 194.47 0 261.13c0 40.9 20.43 77.09 51.61 98.97-20.12-21.6-32.46-50.53-32.46-82.31 0-65.7 52.69-119.28 118.03-120.81Z"/><path d="M140.02 333c29.74 0 54-23.66 55.1-53.13l.11-263.2h48.08c-1-5.41-1.55-10.97-1.55-16.67h-65.67l-.11 263.2c-1.1 29.47-25.36 53.13-55.1 53.13-9.24 0-17.95-2.31-25.61-6.34C105.3 323.9 121.6 333 140.02 333ZM333.13 106V91.37c-18.34 0-35.43-5.45-49.76-14.8 12.76 14.65 30.09 25.22 49.76 29.43Z"/><path d="M283.38 76.57c-13.98-16.05-22.47-37-22.47-59.91h-17.59c4.63 25.02 19.48 46.49 40.06 59.91ZM120.88 205.92c-30.44 0-55.21 24.77-55.21 55.21 0 21.2 12.03 39.62 29.6 48.86-6.55-9.08-10.45-20.18-10.45-32.2 0-30.44 24.77-55.21 55.21-55.21 5.68 0 11.13.94 16.29 2.55v-67.05c-5.34-.73-10.76-1.18-16.29-1.18-.96 0-1.9.05-2.85.07v51.49c-5.16-1.61-10.61-2.55-16.29-2.55Z"/><path d="M333.13 106v51.04c-34.05 0-65.61-10.89-91.37-29.38v133.47c0 66.66-54.23 120.88-120.88 120.88-25.76 0-49.64-8.12-69.28-21.91 22.08 23.71 53.54 38.57 88.42 38.57 66.66 0 120.88-54.23 120.88-120.88V144.33c25.76 18.49 57.32 29.38 91.37 29.38v-65.68c-6.57 0-12.97-.71-19.14-2.03Z"/><path d="M241.76 261.13V127.66c25.76 18.49 57.32 29.38 91.37 29.38V106c-19.67-4.21-37-14.77-49.76-29.43-20.58-13.42-35.43-34.88-40.06-59.91h-48.08l-.11 263.2c-1.1 29.47-25.36 53.13-55.1 53.13-18.42 0-34.72-9.1-44.75-23.01-17.57-9.25-29.6-27.67-29.6-48.86 0-30.44 24.77-55.21 55.21-55.21 5.68 0 11.13.94 16.29 2.55v-51.49C71.83 158.5 19.14 212.08 19.14 277.78c0 31.78 12.34 60.71 32.46 82.31C71.23 373.87 95.12 382 120.88 382c66.65 0 120.88-54.23 120.88-120.88Z"/></g></svg>
)

const PinterestIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 256 256" {...props}><path fill="#CB1F27" d="M0 128.002c0 52.414 31.518 97.442 76.619 117.239c-.36-8.938-.064-19.668 2.228-29.393c2.461-10.391 16.47-69.748 16.47-69.748s-4.089-8.173-4.089-20.252c0-18.969 10.994-33.136 24.686-33.136c11.643 0 17.268 8.745 17.268 19.217c0 11.704-7.465 29.211-11.304 45.426c-3.207 13.578 6.808 24.653 20.203 24.653c24.252 0 40.586-31.149 40.586-68.055c0-28.054-18.895-49.052-53.262-49.052c-38.828 0-63.017 28.956-63.017 61.3c0 11.152 3.288 19.016 8.438 25.106c2.368 2.797 2.697 3.922 1.84 7.134c-.614 2.355-2.024 8.025-2.608 10.272c-.852 3.242-3.479 4.401-6.409 3.204c-17.884-7.301-26.213-26.886-26.213-48.902c0-36.361 30.666-79.961 91.482-79.961c48.87 0 81.035 35.364 81.035 73.325c0 50.213-27.916 87.726-69.066 87.726c-13.819 0-26.818-7.47-31.271-15.955c0 0-7.431 29.492-9.005 35.187c-2.714 9.869-8.026 19.733-12.883 27.421a127.897 127.897 0 0 0 36.277 5.249c70.684 0 127.996-57.309 127.996-128.005C256.001 57.309 198.689 0 128.005 0C57.314 0 0 57.309 0 128.002"/></svg>
)

const RedditIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 216 216" {...props}><defs><radialGradient id="reddit__snoo-radial-gragient" cx="169.75" cy="92.19" r="50.98" fx="169.75" fy="92.19" gradientTransform="matrix(1 0 0 .87 0 11.64)" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#feffff"/><stop offset=".4" stopColor="#feffff"/><stop offset=".51" stopColor="#f9fcfc"/><stop offset=".62" stopColor="#edf3f5"/><stop offset=".7" stopColor="#dee9ec"/><stop offset=".72" stopColor="#d8e4e8"/><stop offset=".76" stopColor="#ccd8df"/><stop offset=".8" stopColor="#c8d5dd"/><stop offset=".83" stopColor="#ccd6de"/><stop offset=".85" stopColor="#d8dbe2"/><stop offset=".88" stopColor="#ede3e9"/><stop offset=".9" stopColor="#ffebef"/></radialGradient><radialGradient href="#reddit__snoo-radial-gragient" id="reddit__snoo-radial-gragient-2" cx="47.31" r="50.98" fx="47.31"/><radialGradient href="#reddit__snoo-radial-gragient" id="reddit__snoo-radial-gragient-3" cx="109.61" cy="85.59" r="153.78" fx="109.61" fy="85.59" gradientTransform="matrix(1 0 0 .7 0 25.56)"/><radialGradient id="reddit__snoo-radial-gragient-4" cx="-6.01" cy="64.68" r="12.85" fx="-6.01" fy="64.68" gradientTransform="matrix(1.07 0 0 1.55 81.08 27.26)" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#f60"/><stop offset=".5" stopColor="#ff4500"/><stop offset=".7" stopColor="#fc4301"/><stop offset=".82" stopColor="#f43f07"/><stop offset=".92" stopColor="#e53812"/><stop offset="1" stopColor="#d4301f"/></radialGradient><radialGradient href="#reddit__snoo-radial-gragient-4" id="reddit__snoo-radial-gragient-5" cx="-73.55" cy="64.68" r="12.85" fx="-73.55" fy="64.68" gradientTransform="matrix(-1.07 0 0 1.55 62.87 27.26)"/><radialGradient id="reddit__snoo-radial-gragient-6" cx="107.93" cy="166.96" r="45.3" fx="107.93" fy="166.96" gradientTransform="matrix(1 0 0 .66 0 57.4)" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#172e35"/><stop offset=".29" stopColor="#0e1c21"/><stop offset=".73" stopColor="#030708"/><stop offset="1"/></radialGradient><radialGradient href="#reddit__snoo-radial-gragient" id="reddit__snoo-radial-gragient-7" cx="147.88" cy="32.94" r="39.77" fx="147.88" fy="32.94" gradientTransform="matrix(1 0 0 .98 0 .54)"/><radialGradient id="reddit__snoo-radial-gragient-8" cx="131.31" cy="73.08" r="32.6" fx="131.31" fy="73.08" gradientUnits="userSpaceOnUse"><stop offset=".48" stopColor="#7a9299"/><stop offset=".67" stopColor="#172e35"/><stop offset=".75"/><stop offset=".82" stopColor="#172e35"/></radialGradient></defs><path fill="#ff4500" d="M108 0C48.35 0 0 48.35 0 108c0 29.82 12.09 56.82 31.63 76.37l-20.57 20.57C6.98 209.02 9.87 216 15.64 216H108c59.65 0 108-48.35 108-108S167.65 0 108 0Z"/><circle cx="169.22" cy="106.98" r="25.22" fill="url(#reddit__snoo-radial-gragient)"/><circle cx="46.78" cy="106.98" r="25.22" fill="url(#reddit__snoo-radial-gragient-2)"/><ellipse cx="108.06" cy="128.64" fill="url(#reddit__snoo-radial-gragient-3)" rx="72" ry="54"/><path fill="url(#reddit__snoo-radial-gragient-4)" d="M86.78 123.48c-.42 9.08-6.49 12.38-13.56 12.38s-12.46-4.93-12.04-14.01c.42-9.08 6.49-15.02 13.56-15.02s12.46 7.58 12.04 16.66Z"/><path fill="url(#reddit__snoo-radial-gragient-5)" d="M129.35 123.48c.42 9.08 6.49 12.38 13.56 12.38s12.46-4.93 12.04-14.01c-.42-9.08-6.49-15.02-13.56-15.02s-12.46 7.58-12.04 16.66Z"/><ellipse cx="79.63" cy="116.37" rx="2.8" ry="3.05"/><ellipse cx="146.21" cy="116.37" rx="2.8" ry="3.05"/><path fill="url(#reddit__snoo-radial-gragient-6)" d="M108.06 142.92c-8.76 0-17.16.43-24.92 1.22-1.33.13-2.17 1.51-1.65 2.74 4.35 10.39 14.61 17.69 26.57 17.69s22.23-7.3 26.57-17.69c.52-1.23-.33-2.61-1.65-2.74-7.77-.79-16.16-1.22-24.92-1.22Z"/><circle cx="147.49" cy="49.43" r="17.87" fill="url(#reddit__snoo-radial-gragient-7)"/><path fill="url(#reddit__snoo-radial-gragient-8)" d="M107.8 76.92c-2.14 0-3.87-.89-3.87-2.27 0-16.01 13.03-29.04 29.04-29.04 2.14 0 3.87 1.73 3.87 3.87s-1.73 3.87-3.87 3.87c-11.74 0-21.29 9.55-21.29 21.29 0 1.38-1.73 2.27-3.87 2.27Z"/><path fill="#842123" d="M62.82 122.65c.39-8.56 6.08-14.16 12.69-14.16 6.26 0 11.1 6.39 11.28 14.33.17-8.88-5.13-15.99-12.05-15.99s-13.14 6.05-13.56 15.2c-.42 9.15 4.97 13.83 12.04 13.83h.52c-6.44-.16-11.3-4.79-10.91-13.2Zm90.48 0c-.39-8.56-6.08-14.16-12.69-14.16-6.26 0-11.1 6.39-11.28 14.33-.17-8.88 5.13-15.99 12.05-15.99 7.07 0 13.14 6.05 13.56 15.2.42 9.15-4.97 13.83-12.04 13.83h-.52c6.44-.16 11.3-4.79 10.91-13.2Z"/></svg>
)

const GoogleDriveIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 87.3 78" {...props}><path fill="#0066da" d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L27.5 53H0c0 1.55.4 3.1 1.2 4.5z"/><path fill="#00ac47" d="M43.65 25 29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44A9.06 9.06 0 0 0 0 53h27.5z"/><path fill="#ea4335" d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75L86.1 57.5c.8-1.4 1.2-2.95 1.2-4.5H59.798l5.852 11.5z"/><path fill="#00832d" d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.45-4.5 1.2z"/><path fill="#2684fc" d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z"/><path fill="#ffba00" d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25 59.8 53h27.45c0-1.55-.4-3.1-1.2-4.5z"/></svg>
)

const ZohoWorkDriveIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 960 960" {...props}>
    <path fill="#089949" d="M433.36,596.03c-6.74,0-13.57-1.4-20.14-4.29l-140.11-62.44c-25.05-11.12-36.34-40.63-25.22-65.68l62.44-140.11c11.12-25.05,40.63-36.34,65.68-25.22l140.11,62.44c25.04,11.12,36.34,40.63,25.22,65.68l-62.44,140.11c-8.32,18.56-26.53,29.51-45.54,29.51h0ZM424.87,565.47c10.6,4.73,23.03-.09,27.76-10.6l62.44-140.11c4.73-10.6-.09-23.03-10.6-27.76l-140.2-62.44c-10.6-4.73-23.03.09-27.76,10.6l-62.44,140.11c-4.73,10.6.09,23.03,10.6,27.76l140.2,62.44Z"/>
    <path fill="#f9b21d" d="M872.88,596.12h-153.42c-27.41,0-49.74-22.33-49.74-49.74v-153.42c0-27.41,22.33-49.74,49.74-49.74h153.42c27.41,0,49.74,22.33,49.74,49.74v153.42c0,27.41-22.33,49.74-49.74,49.74ZM719.45,371.94c-11.56,0-21.02,9.46-21.02,21.02v153.42c0,11.56,9.46,21.02,21.02,21.02h153.42c11.56,0,21.02-9.46,21.02-21.02v-153.42c0-11.56-9.46-21.02-21.02-21.02h-153.42Z"/>
    <path fill="#e42527" d="M298.33,421.07l-20.67,46.24c-.26.53-.53.96-.79,1.4l8.06,49.74c1.84,11.47-5.95,22.24-17.34,24.08l-151.5,24.52c-5.52.88-11.12-.44-15.68-3.68s-7.53-8.14-8.41-13.66l-24.52-151.5c-.88-5.52.44-11.12,3.68-15.68s8.14-7.53,13.66-8.41l151.5-24.52c1.14-.18,2.28-.26,3.33-.26,10.07,0,19.09,7.36,20.75,17.69l8.14,50.09,21.37-47.9-1.14-6.74c-4.38-27.06-29.95-45.54-57.01-41.16l-151.5,24.52c-13.05,2.01-24.61,9.11-32.31,19.88-7.79,10.77-10.86,23.91-8.76,37.04l24.52,151.5c2.1,13.14,9.19,24.61,19.97,32.4,8.49,6.22,18.56,9.37,28.99,9.37,2.63,0,5.34-.18,8.06-.61l151.5-24.52c27.06-4.38,45.54-29.95,41.16-57.01l-15.06-92.82Z"/>
    <path fill="#226db4" d="M480.04,493.4l22.24-49.83-6.31-46.32c-.79-5.52.7-11.03,4.12-15.5s8.32-7.36,13.92-8.06l152.02-20.67c.96-.09,1.93-.18,2.89-.18,4.55,0,8.93,1.49,12.7,4.29.7.53,1.31,1.14,1.93,1.66,6.74-7.09,15.59-12.17,25.48-14.36-2.8-3.85-6.13-7.27-10.07-10.25-10.6-8.06-23.64-11.47-36.78-9.72l-152.2,20.67c-13.14,1.75-24.87,8.58-32.84,19.18-8.06,10.6-11.47,23.64-9.72,36.78l12.61,92.3Z"/>
    <path fill="#226db4" d="M738.72,519.06l-19.97-147.12c-11.21.35-20.23,9.63-20.23,20.93v43.17l11.82,86.87c.79,5.52-.7,11.03-4.12,15.5s-8.32,7.36-13.92,8.06l-152.02,20.67c-5.52.79-11.03-.7-15.5-4.12s-7.36-8.32-8.06-13.92l-7.01-51.58-22.24,49.83.79,5.6c1.75,13.14,8.58,24.87,19.18,32.84,8.76,6.66,19.18,10.16,30.04,10.16,2.28,0,4.55-.18,6.83-.44l151.85-20.49c13.14-1.75,24.87-8.58,32.84-19.18,8.06-10.6,11.47-23.64,9.72-36.78h0Z"/>
  </svg>
)

const FeaturesPage = () => {
  const [activeTab, setActiveTab] = useState("All Features")

  const tabs = [
    "All Features",
    "Content Creation",
    "Social Media",
    "Automation",
    "Analytics",
    "Security",
    "Integrations"
  ]

  const features = [
    {
      id: 1,
      title: "Image Generation",
      description: "Generate high-quality images from text prompts using Google Gemini's advanced multimodal AI models.",
      status: "Completed",
      icon: ImageIcon,
      iconColors: "bg-green-100 text-green-600",
      category: "CONTENT CREATION",
      filterGroups: ["All Features", "Content Creation"],
    },
    {
      id: 2,
      title: "Video Generation",
      description: "Create engaging videos from text prompts using FreepikAI's video generation technology.",
      status: "Completed",
      icon: PlaySquare,
      iconColors: "bg-indigo-100 text-indigo-600",
      category: "CONTENT CREATION",
      filterGroups: ["All Features", "Content Creation"],
    },
    {
      id: 3,
      title: "Content Generation",
      description: "Generate high-quality written content from text prompts using Google Gemini's language models.",
      status: "Completed",
      icon: FileText,
      iconColors: "bg-blue-100 text-primary",
      category: "CONTENT CREATION",
      filterGroups: ["All Features", "Content Creation"],
    },
    {
      id: 4,
      title: "Twitter Automation",
      description: "Automatically post content to your Twitter account using Twitter's official API with analytics tracking.",
      status: "Completed",
      icon: TwitterIcon,
      iconColors: "bg-sky-50",
      category: "SOCIAL MEDIA AUTOMATION",
      filterGroups: ["All Features", "Social Media", "Automation"],
    },
    {
      id: 5,
      title: "LinkedIn Automation",
      description: "Post content automatically to your LinkedIn personal account and business pages using LinkedIn's official API.",
      status: "Completed",
      icon: LinkedinIcon,
      iconColors: "bg-blue-50",
      category: "SOCIAL MEDIA AUTOMATION",
      filterGroups: ["All Features", "Social Media", "Automation"],
    },
    {
      id: 6,
      title: "Facebook Automation",
      description: "Automatically publish content to your Facebook pages using Facebook's official API.",
      status: "Completed",
      icon: FacebookIcon,
      iconColors: "bg-blue-50",
      category: "SOCIAL MEDIA AUTOMATION",
      filterGroups: ["All Features", "Social Media", "Automation"],
    },
    {
      id: 7,
      title: "Instagram Automation",
      description: "Post content automatically to your Instagram personal account using Instagram's official API.",
      status: "Pending",
      icon: InstagramIcon,
      iconColors: "bg-pink-50",
      category: "SOCIAL MEDIA AUTOMATION",
      filterGroups: ["All Features", "Social Media", "Automation"],
    },
    {
      id: 8,
      title: "YouTube Automation",
      description: "Upload and manage videos on your YouTube channel automatically using Google's official API.",
      status: "Completed",
      icon: YoutubeIcon,
      iconColors: "bg-red-50",
      category: "SOCIAL MEDIA AUTOMATION",
      filterGroups: ["All Features", "Social Media", "Automation"],
    },
    {
      id: 9,
      title: "TikTok Automation",
      description: "Automatically post videos to your TikTok account using TikTok's official API.",
      status: "Pending",
      icon: TiktokIcon,
      iconColors: "bg-slate-100 fill-slate-900",
      category: "SOCIAL MEDIA AUTOMATION",
      filterGroups: ["All Features", "Social Media", "Automation"],
    },
    {
      id: 10,
      title: "Pinterest Automation",
      description: "Automatically pin content to your Pinterest boards using Pinterest's official API.",
      status: "Completed",
      icon: PinterestIcon,
      iconColors: "bg-red-50",
      category: "SOCIAL MEDIA AUTOMATION",
      filterGroups: ["All Features", "Social Media", "Automation"],
    },
    {
      id: 11,
      title: "Reddit Automation",
      description: "Automatically submit text, links, and cross-posts to targeted subreddits using Reddit's API.",
      status: "Pending",
      icon: RedditIcon,
      iconColors: "bg-orange-50",
      category: "SOCIAL MEDIA AUTOMATION",
      filterGroups: ["All Features", "Social Media", "Automation"],
    },
    {
      id: 12,
      title: "Content Scheduling",
      description: "Schedule posts for optimal timing using advanced scheduling system with reliable execution.",
      status: "Completed",
      icon: CalendarDays,
      iconColors: "bg-indigo-100 text-indigo-500",
      category: "AUTOMATION & ANALYTICS",
      filterGroups: ["All Features", "Automation"],
    },
    {
      id: 13,
      title: "Post Analytics Dashboard",
      description: "Comprehensive dashboard to track post performance, reach, and engagement metrics across all platforms.",
      status: "In Progress",
      icon: BarChart3,
      iconColors: "bg-orange-100 text-orange-500",
      category: "AUTOMATION & ANALYTICS",
      filterGroups: ["All Features", "Analytics"],
    },
    {
      id: 14,
      title: "Encryption & Security",
      description: "Enterprise-grade encryption to securely protect user credentials and data with full security compliance.",
      status: "Completed",
      icon: ShieldCheck,
      iconColors: "bg-indigo-100 text-indigo-700",
      category: "AUTOMATION & ANALYTICS",
      filterGroups: ["All Features", "Security"],
    },
    {
      id: 15,
      title: "Zoho WorkDrive Integration",
      description: "Seamlessly fetch and use files from your Zoho WorkDrive for content creation and posting.",
      status: "Completed",
      icon: ZohoWorkDriveIcon, 
      iconColors: "bg-green-100 text-green-500",
      category: "INTEGRATIONS",
      filterGroups: ["All Features", "Integrations"],
    },
    {
      id: 16,
      title: "Google Drive Integration",
      description: "Direct integration with Google Drive to access and utilize your files for content generation.",
      status: "Completed",
      icon: GoogleDriveIcon, 
      iconColors: "bg-blue-100 text-blue-500",
      category: "INTEGRATIONS",
      filterGroups: ["All Features", "Integrations"],
    },
  ]

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-50 text-green-600 border-green-200 hover:bg-green-100"
      case "In Progress":
        return "bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100"
      case "Pending":
      default:
        return "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200"
    }
  }

  const completedCount = features.filter((f) => f.status === "Completed").length
  const inProgressCount = features.filter((f) => f.status === "In Progress").length
  const pendingCount = features.filter((f) => f.status === "Pending").length

  const filteredFeatures = features.filter(f => f.filterGroups.includes(activeTab))

  const groupedFeatures = filteredFeatures.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = []
    }
    acc[feature.category].push(feature)
    return acc
  }, {} as Record<string, typeof features>)

  return (
    <div className="min-h-screen bg-slate-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* HERO SECTION */}
        <div className="flex flex-col lg:flex-row items-center justify-between mb-12">
          <div className="lg:w-1/2">
            <span className="text-xs font-bold uppercase tracking-widest text-primary mb-3 block">
              Product Roadmap
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-5xl font-extrabold text-slate-900 leading-[1.15] mb-4">
              Everything you need.<br />
              All in <span className="text-primary">one</span> platform.
            </h1>
            <p className="text-slate-500 text-base max-w-md leading-relaxed">
              Powerful tools to streamline content creation, automate your social media, and drive meaningful engagement.
            </p>
          </div>
          <Image src="/images/illustration1.png" width={500} height={500} unoptimized alt="Hero Image" className="lg:w-1/2 flex justify-end mt-8 lg:mt-0 opacity-80 pointer-events-none" />
        </div> 

        {/* STATS STRIP */}
        <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-0 mb-10">
          
          {/* COMPLETED */}
          <div className="flex-1 w-full flex items-center justify-center gap-4 sm:border-r border-slate-200">
            <div className="bg-blue-50 rounded-full text-primary border border-blue-100">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">{completedCount}</div>
              <div className="text-sm font-medium text-slate-500">Completed</div>
            </div>
          </div>

          {/* IN PROGRESS */}
          <div className="flex-1 w-full flex items-center justify-center gap-4 sm:border-r border-slate-200">
            <div className="p-3 bg-green-50 rounded-full text-green-500 border border-green-100">
              <Hourglass className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">{inProgressCount}</div>
              <div className="text-sm font-medium text-slate-500">In Progress</div>
            </div>
          </div>

          {/* PENDING */}
          <div className="flex-1 w-full flex items-center justify-center gap-4">
            <div className="p-3 bg-orange-50 rounded-full text-orange-500 border border-orange-100">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">{pendingCount}</div>
              <div className="text-sm font-medium text-slate-500">Pending</div>
            </div>
          </div>
          
        </div>

        {/* TABS */}
        <div className="flex flex-wrap gap-2 mb-10 border-b border-slate-200 pb-4">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-5 py-2 rounded-md text-sm font-medium transition-all duration-200",
                activeTab === tab 
                  ? "bg-primary text-white shadow-sm" 
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* GROUPED FEATURES */}
        <div className="space-y-12">
          {Object.entries(groupedFeatures).map(([categoryName, categoryFeatures]) => (
            <div key={categoryName}>
              <h3 className="text-sm font-bold text-slate-400 tracking-wider mb-6">
                {categoryName}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {categoryFeatures.map((feature) => {
                  const Icon = feature.icon
                  return (
                    <Card
                      key={feature.id}
                      className="p-10 border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 bg-white flex flex-col justify-between"
                    >
                      <CardHeader className="flex-none px-0">
                        <div className="flex gap-4 items-start mb-2">
                          <div className={cn("rounded-xl flex items-center justify-center")}>
                            <Icon className="h-10 w-10" strokeWidth={1.5} />
                          </div>
                          <div className="pt-1">
                            <CardTitle className="text-base font-bold text-slate-800 leading-tight mb-2">
                              {feature.title}
                            </CardTitle>
                          </div>
                        </div>
                        <CardDescription className="text-slate-500 text-sm leading-relaxed min-h-[60px]">
                          {feature.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="px-0">
                        <Badge variant="outline" className={cn("font-medium border py-1 text-xs rounded-md shadow-none", getStatusStyles(feature.status))}>
                          {feature.status}
                        </Badge>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default FeaturesPage