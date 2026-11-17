// Where an owl is, in words: over a city, so many km from the nearest big city, or out over a named sea.
// Shared by the app and the tick function (keep it free of imports).
// LAND is a half-degree land/sea grid from Natural Earth (public domain), run-length encoded:
// rows from 90°N to 90°S, columns from 180°W eastward, runs alternate sea, land, sea… in base 36.

const RES = 0.5, W = 720;
const LAND = '7fl,2,3,3,2,p,gy,1,2,5,2,h,2,6,10,5,3,13,gg,5,3,15,c,3,2,1,4,5,4,2,1,11,gd,1i,7,5,1,1v,2,5,9,6,3z,2,bi,4,6,6,2,d,1,p,9,26,2,h,3s,5,22,2,9e,8,5,3,1,c,4,k,6,2u,3e,2,1,1,1,5,6,6,4,5,2,3,1l,a,98,e,1,2,2,5,2,q,6,2n,1,5,1z,1,1,2,3,1,2,3,17,4,6,4,2,1,1,2,1,2,1v,a,9a,i,2,8,2,f,1,3,d,2i,2,2,1l,7,1,1,2,4,2,2,2,b,3n,2,2,c,8l,5,l,f,1,i,k,2l,1o,1,1,7,1,6,8,2,3x,9,5,3,8j,7,3,3,7,c,1,p,9,2q,1r,1,2,j,4e,9,8j,4,3,5,7,3,1,1,1,1,2,o,6,2u,4,1,1s,1,4,7,4,3,4a,7,6,1,7q,1,2,6,f,3,a,5,b,4,1,f,f,2u,3,1,1v,5,6,7,bz,8,k,2,s,1,6,a,1,2,n,2r,1,1,1u,6,3z,1,o,8,7g,9,3,2,8,2,n,8,5,p,h,2m,1,1,23,2,2q,6,1s,c,2c,1,4w,7,6,4,1,1,6,4,9,2,1,2,1,6,9,8,g,2,m,9,1,1,2,2c,3,1,4f,2,2,a,1j,3,5,q,1,1,73,2,2,b,5,7,6,9,c,6,a,6,18,27,4c,c,1k,14,1,2,17,1,3,6,1,7,5g,n,2,3,7,4,4,5,2,q,17,23,1,1,1,2,46,8,1j,1e,1b,b,1,4,2,5,1,1,5d,7,v,3,3,h,1,6,1a,20,1,2,47,8,1g,1,1,1e,1h,2,5c,9,3,2,3e,21,46,7,1k,1b,4,2,1j,1,5a,g,k,2,8,8,4,9,6,5,8,1,1d,1p,1,9,45,7,1i,1,1,3,1,16,2,2,1,2,2,1,1j,4,55,g,2,3,c,1,3,3,8,5,5,8,5,6,2,8,1,8,16,1m,2,4,4a,5,s,3,i,b,1,13,4,l,a,a,s,2,53,d,1,7,2,4,3,2,2,5,6,2,2,7,3,3,3,1,5,6,2,a,1d,2,1,1k,1,8,45,6,r,7,5,1,7,1,2,1t,1,v,o,2,55,c,3,j,1,6,8,9,3,2,8,7,3,8,2,4,1,5,13,1r,2,2,45,6,q,8,5,1,5,4,4,2k,1,2,j,a,2,8,4t,8,3,m,1,6,a,5,3,3,8,8,1,l,2,1,10,4,1,1q,43,8,q,8,2,4,1,b,2,1,1,2k,6,1,d,b,2,6,1q,5,15,2,1t,3,a,p,g,7,9,6,2,r,y,1,1,1j,2,6,44,1,1,5,m,b,2,5,4,9,1,2l,5,b,1,r,1j,2,14,1,1,d,1x,s,f,8,7,10,1,3,t,3,3,1b,1,4,3,5,2h,1,2,2,1,1,1,2,1,2,1e,6,k,a,3,i,1,48,26,r,15,1,n,5,1,m,a,a,a,f,1,i,2,1,r,2,1,1g,2,3,2l,2,1,3,1,b,1j,2,f,b,3,h,1,4a,22,17,j,3,1,7,3,1,3,3,9,t,1,2,5,2,4,6,e,3,7,2,5,i,1,1,o,6,1,1,1,1i,2c,2,1,j,1,2,1,3,1h,6,9,b,2,4t,g,3,2,c,14,1e,5,7,1,q,a,e,1,9,7,5,3,1,1,5,3,1,7,8,5,1,2,1,3,i,v,1g,2c,z,1,1,q,3,l,9,6,9,3,59,5,h,1,2,q,2v,2,9,4,3,7,1,6,6,4,6,1,4,6,7,a,1,3,c,z,1e,29,4,2,14,m,1,8,2,8,3,2,d,4,8,3,5,1,4n,1,16,n,2u,d,2,2,3,d,4,4,c,3,1,1,7,c,3,3,d,1,1,r,1,1,17,2f,1,1,1,2,1a,a,4,9,6,1,1,1,10,3,6,1,5x,m,2s,5,5,3,b,3,3,1,2,2,2,1,f,3,9,9,5,5,g,m,1,2,1,1,10,2o,1f,7,3,7,1c,4,64,m,34,1,14,1,b,9,1,9,i,i,15,2q,1f,6,3,5,1c,4,66,2,5,i,31,1,1a,1,4,i,n,h,12,2n,13,2,e,7,1d,2,3,3,5z,1,i,8,4,6,46,2,1,k,e,2,8,i,v,1,4,p,2,b,3,1k,1,1,14,6,6,4,3,1,7l,2,g,6,4b,2,5,1,3,m,b,5,6,j,3,1,r,s,4,2,c,1i,k,4,l,b,7s,7,7,c,4e,3,4,d,l,4,3,m,p,z,i,1h,h,8,i,b,7s,b,3,d,9,2,43,2,8,9,6,1,g,1,1,r,1,3,j,x,1,2,h,1f,j,7,l,3,5,2,7i,1,2,1,4,14,42,3,a,9,1,7,f,s,k,1,1,11,d,1g,l,6,o,4,7t,15,3t,1,4,6,6,3,4,g,g,q,m,14,6,1g,1,1,m,5,8n,m,4,c,40,a,1,d,2,c,7,2,4,s,k,2q,m,6,8q,w,41,i,3,m,1,2,5,3,1,t,h,2q,m,6,8o,1,4,u,41,j,1,6,1,3,6,1,3,9,5,x,e,1z,1,o,o,8,7v,2,o,10,41,r,1,3,c,19,e,2n,p,8,7k,6,5,2,k,15,t,2,34,x,c,1a,c,2n,o,9,7i,7,3,5,h,19,1,2,n,1,6,4,2w,y,g,17,1,3,7,2n,p,8,7h,8,1,5,h,17,3,2,o,2,9,5,2s,y,g,2,1,6,1,12,2,1,2,2b,1,c,r,2,1,4,7,7,70,e,7,2,1,6,1,1j,i,2,4,i,2,1,2h,z,g,8,3,3u,1,1,q,j,70,d,5,1x,g,4,2,o,2g,y,h,8,4,3t,1,1,9,1,f,a,6m,7,1,b,6,a,6,1y,1,4,1,1,2,1,7,v,3,1,2b,1,1,u,h,1,2,4,7,3t,8,3,c,d,6l,z,6,2,1,25,7,2,2,w,2,1,2b,v,t,34,1,2,4,k,4,6,a,b,1,4,6g,10,7,29,4,3,3,x,1,2,1,1,2a,v,u,35,3,v,a,4,1,b,6f,y,c,25,4,4,3,y,2,1,1,1,2a,w,t,33,9,n,2,3,9,3,1,6,3,3,6d,10,c,24,3,19,2,3,2g,o,u,33,7,m,4,4,9,8,6j,z,e,21,4,1b,1,2,1,1,2h,h,2,4,u,34,6,l,6,4,6,a,6i,10,f,1x,4,1h,2,2,2i,j,x,30,1,2,6,k,4,4,1,1,2,e,6g,11,d,1y,2,2,1,1i,2s,b,z,1,1,2w,1,4,7,k,2,1,5,4,1,c,6e,13,d,1v,3,1o,1,5,2o,5,17,2r,6,4,4,k,3,2,2,b,2,3,6f,4,1,z,d,b,1,3g,2n,6,16,2p,9,4,6,j,4,2,2,6,6q,3,1,1,1,5,1,q,8,1u,1,1v,1,4,2p,6,12,2,5,2l,8,6,6,h,b,1,6u,2,4,4,1,q,8,1r,1,1z,1,5,1,1,2l,6,1a,2l,7,3,a,a,7k,1,2,q,8,3s,1,4,1,1,2l,2,1,3,1a,2l,7,4,b,6,7m,1,3,p,5,1i,1,2d,1,7,2j,7,1a,2i,8,4,c,6,7p,r,4,1c,2,2p,2n,3,19,2l,3,7,c,6,7m,2,3,q,3,45,2n,1,16,3,2,2y,9,3,7n,3,3,q,2,44,2,2,3r,4,2,2v,7,5,7q,3,3,p,1,47,3g,5,1,2,4,5,2,2u,1,2,1,a,7q,3,4,m,2,4a,4,2,36,6,2,a,2,1,1,35,7s,3,4,50,4,2,32,a,2,8,5,1,3,2w,7w,3,2,2,1,51,3,2,2z,2,7,c,9,2t,1,3,7v,4,2,55,1,3,2y,1,9,b,b,2q,81,4,1,56,3,1,2x,1,9,b,a,2,2,2q,7y,5,1,57,3a,j,1,2,2,2u,29,1,5k,6,2,56,3a,1,1,6,1,e,1,2u,26,3,n,6,4r,7,3,56,2t,1,g,2,2,2,3,3a,1r,2,8,6,l,8,4q,8,1,57,3e,3,1,1,1,3a,s,1,x,6,4,6,k,a,4p,o,1,4s,2r,1,g,4,6,3c,q,3,w,7,7,1,l,8,4r,9,2,b,1,4v,36,3,5,3g,r,5,s,9,2,6,j,8,4r,b,2,8,1,4x,32,6,3,3i,k,2,6,5,r,l,g,7,4r,b,4,3,1,51,30,8,2,3j,i,6,5,6,p,m,g,7,4p,c,7,51,30,3f,p,4,2,8,7,6,m,p,e,8,4h,1,4,e,8,50,2z,3g,o,e,1,1,6,8,k,r,c,a,4e,3,1,d,8,53,2z,3h,n,b,2,4,6,9,i,r,d,9,4c,j,1,4,2,55,2z,3f,o,b,2,6,7,7,h,9,6,c,e,8,1,2,48,k,1,5b,2u,3l,l,n,6,6,j,5,b,8,g,b,46,n,1,59,2u,3l,j,e,3,a,6,4,9,1,1,2,3,5,13,7,1,2,3p,2,f,l,3,58,2t,3m,j,g,2,b,4,2,1,2,6,1,3,4,1a,6,3s,3,d,n,4,58,2s,3m,i,5,2,a,2,d,1,6,7,6,1b,8,3o,4,4,2,6,p,4,58,2n,1,1,1,1,3m,i,i,2,d,2,7,6,5,1b,8,3n,5,1,7,4,p,4,59,2m,1,2,2n,1,z,j,w,1,9,4,8,18,a,3j,g,5,n,4,5b,2k,2,2,3o,h,w,2,a,1,2,3,4,19,a,3k,e,7,m,3,5e,2j,1,1,2s,1,w,g,r,5,b,1,1,3,7,19,a,3m,3,1,b,5,k,4,5d,2k,3r,e,n,1,7,3,d,3,9,1a,7,3m,2,5,9,5,i,5,5e,2k,3v,5,2,1,b,4,1,b,7,1,p,6,2,6,1,1,1,u,4,3t,9,7,e,8,5f,2k,3w,1,c,k,12,1,5,3,4,4p,c,6,7,1,5,9,5g,2k,3v,1,a,n,1e,4o,d,6,d,a,5g,2h,3x,3,1,1,4,p,p,4,1,1,d,2,4,4n,e,6,6,d,2,1,5i,2g,3w,10,16,2,5,4m,f,1,a,5,1,3,2,2,5o,2b,3z,x,1f,4q,h,1,3,3,2,6,5v,26,3z,11,1d,4q,i,1,1,1,3,4,2,1,5x,24,3y,13,1c,4r,b,1,6,5,1,1,63,23,3i,1,f,1a,e,3,p,4s,f,1,2,4,66,21,3y,1e,9,6,o,4t,i,2,68,1z,3z,1e,9,a,j,4v,f,4,68,3,4,1r,3z,1h,7,f,5,5,3,4v,6t,3,3,1r,3z,1k,4,5n,6t,3,3,19,1,1,2,1,4,9,40,78,1,1,6u,3,3,z,1,1,2,7,8,1,3,5,3y,39,4,3z,6u,4,2,y,8,2,1,1,c,4,3x,2e,1,3,1,q,5,3z,6v,3,2,x,q,4,3h,1,d,2j,1,r,5,3x,6u,1,2,2,3,t,t,4,3j,1,a,2h,1,u,6,3v,g,1,6f,1,1,3,4,q,t,5,3r,2l,4,r,6,3t,6y,5,3,q,u,5,3p,2n,4,r,7,3r,71,3,3,p,v,4,3p,2n,4,s,7,3,1,1,2,3h,h,1,6m,2,4,o,v,4,3n,2p,5,r,e,3h,g,1,6o,1,4,p,v,3,3n,2q,5,q,2,1,9,1,2,3g,75,2,5,m,x,1,3n,2s,4,r,1,1,8,2,9,3,1,1,6,2y,75,3,5,l,12,1,3i,2s,4,t,6,4,l,2v,5,2,71,3,5,k,13,1,3g,2u,4,t,5,5,l,2t,5,2,74,2,5,j,4j,2v,6,13,k,2r,5,3,75,1,6,h,4k,2v,6,15,j,2o,7,3,7d,g,s,9,a,1,37,2x,6,15,m,14,1,1c,a,2,7f,f,r,2,3,7,3g,2y,5,16,i,6,1,11,2,17,e,1,7f,g,t,1,5,5,3d,30,4,15,k,5,1,y,5,14,7y,f,f,6,h,4,3b,30,4,14,m,4,1,t,a,v,5,1,56,1,2t,h,d,7,i,4,3b,2z,5,12,o,1,4,s,b,s,7,1,80,h,d,6,k,7,38,2y,6,10,1,1,s,r,d,r,5f,2,2r,i,c,6,s,3,1,2,30,30,7,x,u,p,h,p,7,3,56,1,2t,i,a,7,t,8,2x,30,7,y,u,o,h,p,5,4,83,g,9,8,u,8,2x,2z,7,w,w,n,j,n,6,4,85,h,1,c,j,4,5,6,1,1,2,1,3,3,2r,31,6,u,x,m,l,n,t,4,7k,r,1a,1,2p,31,7,r,z,l,m,o,s,3,7m,p,41,32,7,p,10,j,o,p,r,4,7o,m,40,33,7,m,14,i,o,3,1,1,1,k,q,4,7q,7,1,c,1h,2,2h,33,8,j,16,f,q,4,3,l,p,3,7u,2,5,a,1,8,3r,34,6,j,17,e,y,m,n,3,83,i,3c,1,d,35,6,i,19,c,10,m,m,3,84,i,3o,39,4,d,1d,c,10,m,o,1,85,i,3o,39,3,c,1f,b,10,m,n,2,2,1,86,d,3q,39,1,1,1,8,1i,b,10,m,m,1,1,1,1,1,1,3,85,2,1,8,18,1,2g,3b,1,5,1m,c,10,3,2,h,m,2,4,1,89,8,3p,3c,1,2,1p,a,p,1,b,3,2,h,n,1,8f,7,n,2,31,3c,1r,a,11,3,5,d,o,1,3,2,1,2,88,6,m,2,34,39,f,1,1d,9,p,1,b,3,6,c,q,1,5,1,89,4,k,4,3,4,2x,3b,a,5,1e,8,11,2,7,c,q,2,1,1,1,2,8a,4,g,e,e,1,2l,39,3,b,1e,8,10,3,7,a,s,1,1,1,8d,5,g,7,1,b,3,4,2,1,2l,3n,1e,7,12,1,b,4,p,1,7,2,8d,1,1,3,f,7,2,j,2o,3l,1f,5,2,1,10,1,c,3,o,1,7,1,2,1,8f,3,5,4,4,8,2,k,2n,3k,1g,6,1,2,z,3,a,2,o,1,9,1,4,1,8d,8,2,2,2,v,2o,3j,1g,3,4,2,y,4,z,1,e,3,8f,3,4,12,2l,3i,1i,2,4,3,y,4,19,7,8g,3,3,13,2l,3h,1o,3,z,2,18,3,1,5,8h,1,5,13,2l,3f,1p,4,z,2,x,1,9,1,3,3,1,1,8o,13,2l,3d,1q,4,10,3,u,2,d,3,8q,14,2m,p,5,2h,1q,3,11,4,s,3,d,3,8q,1b,2g,k,a,2g,2v,4,r,5,d,1,8q,1e,2e,c,1,4,d,2e,2l,4,7,5,p,8,92,1f,2f,4,o,2d,2n,5,5,6,m,8,94,1g,3d,26,2o,5,4,6,l,8,96,1g,3b,1,1,24,2q,5,4,5,9,1,a,8,96,1h,3e,22,2s,5,4,4,j,9,95,1i,3e,21,2q,1,3,5,3,4,g,d,93,1k,3d,1z,2x,5,3,4,e,e,k,1,44,1,4c,1m,3b,1z,2z,6,3,2,b,1,2,e,j,1,8i,1m,3b,1x,2y,1,3,7,d,j,5,1,6,1,5,2,8f,1n,3c,1w,30,1,2,7,d,i,4,9,6,2,8f,1n,1,1,3a,1v,35,6,1,1,b,h,k,1,7t,2,k,1m,2,4,38,1u,37,7,b,h,4,1,f,1,6,1,7m,1,l,1s,1,2,34,1u,38,7,c,g,4,1,6,1,7,3,6,5,3,1,7y,1s,1,5,32,1u,35,1,3,8,b,e,5,2,1,3,h,6,82,1r,1,9,30,1s,3a,8,2,1,8,d,6,5,5,1,a,1,3,4,4,2,1,2,7t,21,30,1r,39,1,2,8,a,d,5,6,l,1,7,6,7t,23,2x,1o,3f,a,2,1,4,d,5,3,1,2,k,1,1,3,3,b,7p,29,2s,1n,3f,9,c,2,1,5,6,3,1,3,7,2,3,4,4,5,1,e,i,1,72,2d,2r,1m,3g,8,h,2,1,1,6,2,1,3,8,1,7,1,4,1,1,k,7i,2e,2r,1k,3i,7,r,2,2,3,o,k,d,1,1,1,6z,2g,2r,1i,3l,5,r,2,2,1,t,i,c,2,71,2j,2n,1i,1,1,3k,4,r,2,4,1,t,h,a,2,72,2k,2m,1i,3p,1,1h,1,2,1,7,h,4,6,6,1,6w,2k,2n,1i,3p,4,1g,1,8,i,4,2,9,1,6x,2i,2n,1i,3o,6,4,2,19,1,9,g,h,1,6x,2h,2o,1h,3q,c,1g,h,k,1,6u,2h,2o,1h,3t,1,2,a,n,1,9,1,d,c,2,5,i,1,3,1,6s,2g,2p,1g,3z,9,f,4,p,3,2,7,5,4,i,2,6u,2g,2p,1g,47,1,1,1,1,3,3,4,6,4,r,6,6,4,o,1,6p,2e,2p,1h,4p,3,y,1,8,4,2,1,l,1,6o,2d,2q,1h,4g,2,6,3,19,5,k,2,6q,2c,2r,1h,4n,1,1e,4,7a,2a,2t,1i,4l,1,25,1,6o,29,2u,1h,51,1,1,1,j,2,7s,27,2v,1h,5,1,4t,2,3,2,h,2,7s,26,2v,1i,h,1,4j,1,1,8,1,1,9,3,7t,25,2u,1j,h,1,4i,c,b,3,7s,23,2v,1k,h,2,4g,c,b,4,2g,1,5c,22,2v,1k,f,4,4g,d,a,4,7t,22,2v,1k,f,4,48,3,4,d,1,1,9,4,7t,22,2u,1m,d,5,46,6,3,c,c,7,7s,20,2u,1l,d,7,45,6,1,f,b,8,16,1,6l,1z,2u,1l,c,6,1,1,44,o,a,8,7u,1x,2u,1k,9,b,43,1,1,q,8,8,19,1,m,1,5z,1v,2u,1j,a,a,42,1,1,u,5,9,19,1,k,1,63,1t,2t,1h,c,b,41,y,4,a,3l,1,4c,1s,2t,1f,e,b,41,1c,1r,2,66,1q,2v,1e,e,b,41,1d,7y,1q,2w,1c,f,a,41,1e,7y,1q,2w,1a,i,9,41,1f,7y,1o,2y,17,k,9,3z,1i,7x,1n,2z,17,k,8,i,1,3e,1n,7v,1n,30,17,i,9,3s,1t,v,1,4,1,6t,1m,31,17,h,a,e,1,3c,1u,w,1,6x,1m,32,17,g,9,3q,1x,w,2,6v,1l,34,16,g,9,3p,1y,y,1,6t,1l,35,16,g,9,3n,23,7p,1g,3a,16,g,8,3p,22,7p,1e,3c,16,g,8,3o,24,7o,1b,3f,16,g,8,3o,25,7n,1a,3g,15,i,6,3p,26,1,1,7k,19,3i,11,m,3,3s,25,1,1,7k,18,3j,z,4j,26,7l,18,3j,10,4g,1,1,26,7k,19,3j,10,4h,27,7k,19,3k,z,4i,26,7k,19,3k,y,4j,27,7j,19,3l,x,4k,26,7i,19,3n,v,4l,26,7i,18,3p,t,4n,25,7i,17,3q,s,4o,25,7i,14,1,2,3r,r,4o,24,7j,14,3u,q,4p,24,7j,14,3v,o,4r,23,7j,13,3w,n,4s,r,6,16,7j,13,3x,l,4t,o,c,12,7k,12,3x,k,4v,j,i,10,7l,12,3x,j,4w,h,l,6,1,r,7l,11,40,f,4y,h,n,4,1,s,7l,r,1,9,41,6,56,9,w,2,2,r,7m,s,3,4,44,1,5c,5,y,1,3,1,1,p,7l,u,aw,o,19,2,6b,u,as,2,3,m,1b,2,69,w,ax,l,7m,x,ax,k,1d,1,1,1,65,x,ay,k,1d,3,65,w,b0,i,1f,3,2,2,60,v,b3,6,1,5,1i,8,60,s,d0,7,62,l,d5,6,63,n,d5,5,63,m,d7,3,63,n,bi,1,1o,3,63,i,bn,8,1b,2,1,5,65,1,1,f,bo,7,1a,6,67,1,1,j,bm,5,1b,5,68,1,1,g,2,1,bm,5,1a,5,68,2,1,g,bq,2,1a,5,m,1,5q,f,d1,8,6c,f,cz,7,6c,1,1,g,cy,7,6e,e,d0,8,6f,c,d1,7,6d,2,1,c,d2,5,6e,g,jl,h,jj,1,1,f,ji,h,jj,g,jk,f,7l,1,1,1,bw,f,jl,1,1,c,jn,c,jo,1,1,a,jq,a,i,4,j2,1,1,9,1,1,h,1,j8,1,1,3,1,4,jr,2,1,1,1,4,jq,2,1,2,2,5,js,1,3,5,1o,1,i4,1,1,9,1,1,1j,1,i6,1,1,2,8wj,1,1,3,jo,1,2,3,jr,1,2,4,2,1,jn,2,1,4,jt,4,jv,5,jq,1,2,6,1,1,69,a,2i,9,a,7,x,7,2,2,8o,1,2,5,69,1,3,c,1w,10,3,b,f,8,5,n,18,1,73,2,1,5,6c,k,1e,1o,3,7,3,1c,89,3,65,16,v,3h,1,4,85,4,5z,1j,i,3s,84,5,1,1,5,1,57,2,d,1m,h,42,1,2,2,3,7e,4,6,8,1,1,59,5,9,1o,f,4j,70,1,6,5,2,c,4d,1,x,8,1,1,3,1n,e,4o,78,2,2,b,3j,1,5,1,9,1,7,1,5,1,4,1,e,2,8,21,a,4x,6w,3,5,5,2,b,34,1,4,2,e,e,1,e,4,3,2,2,7,2a,6,4z,1,a,6p,8,2,d,2t,3,3,3,d,3s,6,5e,6g,6,1,8,2,c,2r,4e,7,5k,4x,7,1,2,1c,1,1,4,3,d,2q,4e,2,1,2,5k,4u,1,m,1,4,1,16,e,2k,1,2,4g,2,5o,4u,c,3,2,1,5,2,6,3,1,a,3,6,3,1,1,7,g,2,2,2g,4m,1,5j,3p,1,5,5,10,4,1,10,2,9,2,u,28,1,9,a4,3y,4,c,3,3,2,j,27,2a,1,b,a0,3a,3,d,8,5,f,5,2,l,22,1,1,2g,a1,2,1,34,1r,5,9,6,1x,2j,a0,30,4f,2a,ad,2p,5,1,4b,29,al,2l,2,1,2,6,3t,a,1,2a,ar,26,8,5,1,4,2,5,3u,2f,ax,6,1,1x,h,1,49,25,b1,5,1,25,3y,1,9,1m,b,g,b5,1,1,1,2,1n,2,d,41,5,5,i,4,y,a,j,az,1,3,1s,8,h,3x,k,4,3,2,x,f,d,5,8,al,24,5,l,41,i,2,u,g,m,1,1,1,a,ab,2r,45,j,1,9,4,c,j,s,ai,2w,43,7,3,f,6,b,a,s,aw,2d,50,1f,b8,2j,4x,1a,be,2g,4v,9,2,d,g,5,bh,2d,54,b,cf,19,b,h,5b,6,ck,1d,iz,19,j3,1,o,i,it,5k1';

let grid: Uint8Array | null = null;
function landGrid(): Uint8Array {
  if (grid) return grid;
  const g = new Uint8Array(W * 360);
  let i = 0, v = 0;
  for (const r of LAND.split(',')) { const n = parseInt(r, 36); if (v) g.fill(1, i, i + n); i += n; v ^= 1; }
  return (grid = g);
}
export function isLand(lat: number, lon: number): boolean {
  const y = Math.min(359, Math.max(0, Math.floor((90 - lat) / RES)));
  const x = ((Math.floor((lon + 180) / RES) % W) + W) % W;
  return landGrid()[y * W + x] === 1;
}

export function distKm(a: [number, number], b: [number, number]): number {
  const r = Math.PI / 180, h = Math.sin(((b[0] - a[0]) * r) / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(((b[1] - a[1]) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

/** Big cities, plus the Indian ones friends are most likely to fly between. */
export const CITIES: [string, number, number][] = [
  // India
  ['Mumbai', 19.08, 72.88], ['Delhi', 28.61, 77.21], ['Bengaluru', 12.97, 77.59], ['Kolkata', 22.57, 88.36], ['Chennai', 13.08, 80.27],
  ['Hyderabad', 17.39, 78.49], ['Pune', 18.52, 73.86], ['Ahmedabad', 23.02, 72.57], ['Jaipur', 26.91, 75.79], ['Kochi', 9.93, 76.27],
  ['Goa', 15.5, 73.83], ['Chandigarh', 30.73, 76.78], ['Lucknow', 26.85, 80.95], ['Guwahati', 26.14, 91.74], ['Bhopal', 23.26, 77.41],
  ['Nashik', 20.0, 73.79], ['Indore', 22.72, 75.86], ['Nagpur', 21.15, 79.09], ['Surat', 21.17, 72.83], ['Mysuru', 12.3, 76.64],
  ['Coimbatore', 11.02, 76.96], ['Thiruvananthapuram', 8.52, 76.94], ['Visakhapatnam', 17.69, 83.22], ['Bhubaneswar', 20.3, 85.82],
  ['Patna', 25.59, 85.14], ['Varanasi', 25.32, 82.97], ['Dehradun', 30.32, 78.03], ['Shimla', 31.1, 77.17], ['Srinagar', 34.08, 74.8],
  ['Udaipur', 24.58, 73.71], ['Amritsar', 31.63, 74.87], ['Shillong', 25.58, 91.89], ['Raipur', 21.25, 81.63], ['Ranchi', 23.34, 85.31],
  ['Jodhpur', 26.24, 73.02], ['Vadodara', 22.31, 73.18], ['Aurangabad', 19.88, 75.34], ['Hubballi', 15.36, 75.12], ['Mangaluru', 12.91, 74.86],
  ['Madurai', 9.93, 78.12], ['Vijayawada', 16.51, 80.65], ['Kanpur', 26.45, 80.33], ['Agra', 27.18, 78.01], ['Leh', 34.15, 77.58],
  ['Port Blair', 11.62, 92.73], ['Imphal', 24.82, 93.94], ['Jammu', 32.73, 74.86], ['Kozhikode', 11.26, 75.78], ['Puducherry', 11.94, 79.81],
  ['Rajkot', 22.3, 70.8], ['Bhuj', 23.24, 69.67], ['Jaisalmer', 26.91, 70.91], ['Gorakhpur', 26.76, 83.37], ['Siliguri', 26.73, 88.4],
  // South Asia and around
  ['Kathmandu', 27.72, 85.32], ['Colombo', 6.93, 79.86], ['Dhaka', 23.81, 90.41], ['Chittagong', 22.36, 91.78], ['Thimphu', 27.47, 89.64],
  ['Malé', 4.18, 73.51], ['Karachi', 24.86, 67.0], ['Lahore', 31.55, 74.34], ['Islamabad', 33.68, 73.05], ['Kabul', 34.56, 69.21],
  ['Yangon', 16.84, 96.17], ['Mandalay', 21.97, 96.08], ['Jaffna', 9.66, 80.01],
  // Middle East
  ['Dubai', 25.2, 55.27], ['Abu Dhabi', 24.45, 54.38], ['Doha', 25.29, 51.53], ['Muscat', 23.59, 58.41], ['Salalah', 17.02, 54.09],
  ['Riyadh', 24.71, 46.68], ['Jeddah', 21.49, 39.19], ['Mecca', 21.39, 39.86], ['Medina', 24.47, 39.61], ['Kuwait City', 29.38, 47.99],
  ['Manama', 26.23, 50.59], ['Tehran', 35.69, 51.39], ['Isfahan', 32.65, 51.67], ['Shiraz', 29.59, 52.58], ['Mashhad', 36.3, 59.6],
  ['Baghdad', 33.31, 44.36], ['Basra', 30.51, 47.81], ['Amman', 31.95, 35.93], ['Jerusalem', 31.77, 35.21], ['Tel Aviv', 32.09, 34.78],
  ['Beirut', 33.89, 35.5], ['Damascus', 33.51, 36.28], ['Sanaa', 15.37, 44.19], ['Aden', 12.79, 45.02], ['Istanbul', 41.01, 28.98],
  ['Ankara', 39.93, 32.86], ['Izmir', 38.42, 27.14], ['Antalya', 36.9, 30.71],
  // Central Asia and Caucasus
  ['Tashkent', 41.3, 69.24], ['Samarkand', 39.65, 66.96], ['Almaty', 43.24, 76.95], ['Astana', 51.17, 71.45], ['Bishkek', 42.87, 74.59],
  ['Dushanbe', 38.56, 68.77], ['Ashgabat', 37.96, 58.33], ['Baku', 40.41, 49.87], ['Tbilisi', 41.72, 44.79], ['Yerevan', 40.18, 44.51],
  // East and Southeast Asia
  ['Bangkok', 13.76, 100.5], ['Phuket', 7.88, 98.39], ['Chiang Mai', 18.79, 98.98], ['Kuala Lumpur', 3.14, 101.69], ['Penang', 5.41, 100.33],
  ['Singapore', 1.35, 103.82], ['Jakarta', -6.21, 106.85], ['Bali', -8.65, 115.22], ['Surabaya', -7.25, 112.75], ['Medan', 3.59, 98.67],
  ['Manila', 14.6, 120.98], ['Cebu', 10.32, 123.89], ['Ho Chi Minh City', 10.82, 106.63], ['Hanoi', 21.03, 105.85], ['Da Nang', 16.05, 108.2],
  ['Phnom Penh', 11.56, 104.93], ['Vientiane', 17.98, 102.63], ['Hong Kong', 22.32, 114.17], ['Guangzhou', 23.13, 113.26], ['Shenzhen', 22.54, 114.06],
  ['Shanghai', 31.23, 121.47], ['Beijing', 39.9, 116.4], ['Chengdu', 30.57, 104.07], ['Chongqing', 29.56, 106.55], ['Kunming', 25.04, 102.71],
  ['Lhasa', 29.65, 91.11], ['Urumqi', 43.83, 87.62], ['Kashgar', 39.47, 75.99], ['Xi’an', 34.34, 108.94], ['Wuhan', 30.59, 114.31],
  ['Harbin', 45.8, 126.53], ['Taipei', 25.03, 121.57], ['Seoul', 37.57, 126.98], ['Busan', 35.18, 129.08], ['Tokyo', 35.68, 139.69],
  ['Osaka', 34.69, 135.5], ['Sapporo', 43.06, 141.35], ['Fukuoka', 33.59, 130.4], ['Ulaanbaatar', 47.89, 106.91], ['Vladivostok', 43.12, 131.89],
  // Europe
  ['London', 51.51, -0.13], ['Manchester', 53.48, -2.24], ['Edinburgh', 55.95, -3.19], ['Dublin', 53.35, -6.26], ['Paris', 48.86, 2.35],
  ['Lyon', 45.76, 4.84], ['Marseille', 43.3, 5.37], ['Brussels', 50.85, 4.35], ['Amsterdam', 52.37, 4.9], ['Berlin', 52.52, 13.4],
  ['Hamburg', 53.55, 9.99], ['Munich', 48.14, 11.58], ['Frankfurt', 50.11, 8.68], ['Cologne', 50.94, 6.96], ['Leipzig', 51.34, 12.37],
  ['Dessau', 51.84, 12.24], ['Zurich', 47.38, 8.54], ['Geneva', 46.2, 6.14], ['Vienna', 48.21, 16.37], ['Prague', 50.08, 14.44],
  ['Warsaw', 52.23, 21.01], ['Kraków', 50.06, 19.94], ['Budapest', 47.5, 19.04], ['Bucharest', 44.43, 26.1], ['Sofia', 42.7, 23.32],
  ['Belgrade', 44.79, 20.45], ['Zagreb', 45.81, 15.98], ['Athens', 37.98, 23.73], ['Thessaloniki', 40.64, 22.94], ['Rome', 41.9, 12.5],
  ['Milan', 45.46, 9.19], ['Naples', 40.85, 14.27], ['Venice', 45.44, 12.32], ['Palermo', 38.12, 13.36], ['Madrid', 40.42, -3.7],
  ['Barcelona', 41.39, 2.17], ['Seville', 37.39, -5.98], ['Valencia', 39.47, -0.38], ['Lisbon', 38.72, -9.14], ['Porto', 41.15, -8.61],
  ['Copenhagen', 55.68, 12.57], ['Oslo', 59.91, 10.75], ['Bergen', 60.39, 5.32], ['Stockholm', 59.33, 18.07], ['Helsinki', 60.17, 24.94],
  ['Tallinn', 59.44, 24.75], ['Riga', 56.95, 24.11], ['Vilnius', 54.69, 25.28], ['Kyiv', 50.45, 30.52], ['Odesa', 46.48, 30.73],
  ['Minsk', 53.9, 27.56], ['Moscow', 55.76, 37.62], ['Saint Petersburg', 59.93, 30.34], ['Kazan', 55.8, 49.11], ['Yekaterinburg', 56.84, 60.6],
  ['Novosibirsk', 55.01, 82.93], ['Irkutsk', 52.29, 104.3], ['Reykjavik', 64.15, -21.94], ['Valletta', 35.9, 14.51], ['Nicosia', 35.19, 33.38],
  // Africa
  ['Cairo', 30.04, 31.24], ['Alexandria', 31.2, 29.92], ['Luxor', 25.69, 32.64], ['Khartoum', 15.5, 32.56], ['Addis Ababa', 9.03, 38.74],
  ['Djibouti', 11.59, 43.15], ['Mogadishu', 2.05, 45.32], ['Nairobi', -1.29, 36.82], ['Mombasa', -4.04, 39.67], ['Kampala', 0.35, 32.58],
  ['Kigali', -1.95, 30.06], ['Dar es Salaam', -6.79, 39.21], ['Zanzibar', -6.17, 39.2], ['Lusaka', -15.39, 28.32], ['Harare', -17.83, 31.05],
  ['Maputo', -25.97, 32.57], ['Johannesburg', -26.2, 28.05], ['Cape Town', -33.92, 18.42], ['Durban', -29.86, 31.03], ['Windhoek', -22.56, 17.08],
  ['Luanda', -8.84, 13.23], ['Kinshasa', -4.44, 15.27], ['Lagos', 6.52, 3.38], ['Abuja', 9.08, 7.4], ['Accra', 5.6, -0.19],
  ['Dakar', 14.72, -17.47], ['Abidjan', 5.36, -4.01], ['Casablanca', 33.57, -7.59], ['Marrakesh', 31.63, -7.98], ['Tunis', 36.81, 10.18],
  ['Algiers', 36.75, 3.06], ['Tripoli', 32.89, 13.19], ['Antananarivo', -18.88, 47.51], ['Port Louis', -20.16, 57.5], ['Victoria', -4.62, 55.45],
  ['Timbuktu', 16.77, -3.01], ['Niamey', 13.51, 2.13], ['N’Djamena', 12.13, 15.06],
  // Americas
  ['New York', 40.71, -74.0], ['Boston', 42.36, -71.06], ['Washington', 38.91, -77.04], ['Philadelphia', 39.95, -75.17], ['Miami', 25.76, -80.19],
  ['Atlanta', 33.75, -84.39], ['Chicago', 41.88, -87.63], ['Detroit', 42.33, -83.05], ['Houston', 29.76, -95.37], ['Dallas', 32.78, -96.8],
  ['Austin', 30.27, -97.74], ['New Orleans', 29.95, -90.07], ['Denver', 39.74, -104.99], ['Phoenix', 33.45, -112.07], ['Las Vegas', 36.17, -115.14],
  ['Los Angeles', 34.05, -118.24], ['San Diego', 32.72, -117.16], ['San Francisco', 37.77, -122.42], ['Seattle', 47.61, -122.33], ['Portland', 45.52, -122.68],
  ['Salt Lake City', 40.76, -111.89], ['Minneapolis', 44.98, -93.27], ['St. Louis', 38.63, -90.2], ['Honolulu', 21.31, -157.86], ['Anchorage', 61.22, -149.9],
  ['Toronto', 43.65, -79.38], ['Montreal', 45.5, -73.57], ['Ottawa', 45.42, -75.7], ['Vancouver', 49.28, -123.12], ['Calgary', 51.05, -114.07],
  ['Winnipeg', 49.9, -97.14], ['Halifax', 44.65, -63.58], ['Mexico City', 19.43, -99.13], ['Guadalajara', 20.67, -103.35], ['Cancún', 21.16, -86.85],
  ['Havana', 23.11, -82.37], ['Panama City', 8.98, -79.52], ['San José', 9.93, -84.08], ['Bogotá', 4.71, -74.07], ['Caracas', 10.48, -66.9],
  ['Lima', -12.05, -77.04], ['Quito', -0.18, -78.47], ['La Paz', -16.5, -68.15], ['Santiago', -33.45, -70.67], ['Buenos Aires', -34.6, -58.38],
  ['Montevideo', -34.9, -56.16], ['São Paulo', -23.55, -46.63], ['Rio de Janeiro', -22.91, -43.17], ['Brasília', -15.79, -47.88], ['Salvador', -12.97, -38.5],
  ['Recife', -8.05, -34.88], ['Manaus', -3.12, -60.02], ['Santo Domingo', 18.49, -69.93], ['San Juan', 18.47, -66.11], ['Kingston', 18.02, -76.8],
  // Oceania
  ['Sydney', -33.87, 151.21], ['Melbourne', -37.81, 144.96], ['Brisbane', -27.47, 153.03], ['Perth', -31.95, 115.86], ['Adelaide', -34.93, 138.6],
  ['Darwin', -12.46, 130.84], ['Cairns', -16.92, 145.77], ['Alice Springs', -23.7, 133.88], ['Hobart', -42.88, 147.33], ['Auckland', -36.85, 174.76],
  ['Wellington', -41.29, 174.78], ['Christchurch', -43.53, 172.64], ['Suva', -18.14, 178.44], ['Port Moresby', -9.44, 147.18], ['Nouméa', -22.28, 166.46]
];

/** Points inside each sea; whichever is nearest names the water. */
const SEAS: [string, number, number][] = [
  ['the Arabian Sea', 15, 65], ['the Arabian Sea', 20, 63], ['the Arabian Sea', 10, 68], ['the Arabian Sea', 17, 70], ['the Laccadive Sea', 9, 75],
  ['the Bay of Bengal', 15, 88], ['the Bay of Bengal', 19, 89], ['the Bay of Bengal', 11, 84], ['the Andaman Sea', 11, 96], ['the Gulf of Mannar', 8.5, 79],
  ['the Persian Gulf', 27, 51], ['the Persian Gulf', 29, 49.5], ['the Gulf of Oman', 24.5, 58.5], ['the Red Sea', 20, 38.5], ['the Red Sea', 25, 35.5],
  ['the Red Sea', 15, 41.5], ['the Gulf of Aden', 12.5, 47], ['the Indian Ocean', 0, 70], ['the Indian Ocean', -10, 80], ['the Indian Ocean', -25, 75],
  ['the Indian Ocean', -10, 60], ['the Indian Ocean', -30, 95], ['the Indian Ocean', -20, 105], ['the Indian Ocean', 3, 90], ['the Indian Ocean', -35, 50],
  ['the Mozambique Channel', -18, 41], ['the Caspian Sea', 42, 50.5], ['the Caspian Sea', 38.5, 51], ['the Black Sea', 43, 34], ['the Sea of Azov', 46, 36.5],
  ['the Mediterranean', 35, 18], ['the Mediterranean', 38, 5], ['the Mediterranean', 33.5, 28], ['the Mediterranean', 34, 33], ['the Aegean Sea', 38.5, 25],
  ['the Adriatic Sea', 43, 15.5], ['the Tyrrhenian Sea', 40, 12], ['the Ionian Sea', 37.5, 19], ['the Strait of Gibraltar', 36, -5.5],
  ['the North Sea', 56, 3], ['the Baltic Sea', 56, 18], ['the Baltic Sea', 59, 21], ['the Gulf of Bothnia', 62.5, 20], ['the English Channel', 50.2, -1.5],
  ['the Irish Sea', 53.8, -5], ['the Bay of Biscay', 45, -4], ['the Norwegian Sea', 67, 3], ['the Barents Sea', 73, 40], ['the Arctic Ocean', 80, 0],
  ['the Arctic Ocean', 78, 120], ['the Arctic Ocean', 78, -150], ['the Kara Sea', 75, 70], ['the Laptev Sea', 75, 125], ['the White Sea', 65.5, 38],
  ['the Atlantic', 45, -30], ['the Atlantic', 30, -45], ['the Atlantic', 15, -35], ['the Atlantic', 0, -20], ['the Atlantic', -15, -20],
  ['the Atlantic', -30, -30], ['the Atlantic', -45, -20], ['the Atlantic', 55, -25], ['the Atlantic', 38, -65], ['the Atlantic', -30, 5],
  ['the Atlantic', 5, 0], ['the Gulf of Guinea', 2, 4], ['the Labrador Sea', 58, -55], ['Baffin Bay', 73, -65], ['Hudson Bay', 59, -86],
  ['the Gulf of Mexico', 25, -90], ['the Caribbean', 15, -75], ['the Caribbean', 14, -66], ['the Gulf of St. Lawrence', 48, -62],
  ['the Pacific', 30, -140], ['the Pacific', 10, -150], ['the Pacific', -10, -130], ['the Pacific', -30, -110], ['the Pacific', 40, 170],
  ['the Pacific', 20, 160], ['the Pacific', 0, 170], ['the Pacific', -15, -165], ['the Pacific', -40, -150], ['the Pacific', 45, -150],
  ['the Pacific', 10, -100], ['the Pacific', -10, -85], ['the Pacific', 25, 140], ['the Pacific', 5, 140], ['the Gulf of California', 27, -111],
  ['the Gulf of Alaska', 57, -145], ['the Bering Sea', 58, -178], ['the Sea of Okhotsk', 53, 150], ['the Sea of Japan', 40, 135], ['the Yellow Sea', 36, 123.5],
  ['the East China Sea', 29, 125], ['the Philippine Sea', 20, 130], ['the South China Sea', 15, 115], ['the South China Sea', 8, 110], ['the South China Sea', 19, 117],
  ['the Gulf of Thailand', 9.5, 101.5], ['the Strait of Malacca', 4, 99.5], ['the Java Sea', -5, 111], ['the Celebes Sea', 3, 122], ['the Banda Sea', -6, 127],
  ['the Coral Sea', -16, 155], ['the Tasman Sea', -38, 160], ['the Arafura Sea', -10, 135], ['the Timor Sea', -11, 126], ['the Great Australian Bight', -35, 130],
  ['the Southern Ocean', -55, 0], ['the Southern Ocean', -55, 90], ['the Southern Ocean', -55, 180], ['the Southern Ocean', -55, -90], ['the Drake Passage', -58, -65]
];

const roundKm = (d: number) => (d < 100 ? Math.max(10, Math.round(d / 10) * 10) : Math.round(d / 50) * 50);

function nearest(list: [string, number, number][], at: [number, number]): [[string, number, number], number] {
  let best = list[0], bd = Infinity;
  for (const p of list) { const d = distKm(at, [p[1], p[2]]); if (d < bd) { bd = d; best = p; } }
  return [best, bd];
}

/**
 * Where a point is, ready to follow "Hedwig is …":
 * "over Dubai", "about 200 km from Dubai", "over the Arabian Sea, about 150 km off Mumbai",
 * "over the Indian Ocean", or "far from anywhere".
 */
export function whereabouts(lat: number, lon: number): string {
  const at: [number, number] = [lat, lon];
  const [city, d] = nearest(CITIES, at);
  if (d < 25) return `over ${city[0]}`;
  if (!isLand(lat, lon)) {
    const sea = nearest(SEAS, at)[0][0];
    return d < 350 ? `over ${sea}, about ${roundKm(d)} km off ${city[0]}` : `over ${sea}`;
  }
  return d < 600 ? `about ${roundKm(d)} km from ${city[0]}` : 'far from anywhere';
}

/** The nearest city in a word, for where someone lives ("near Pune"). */
export function placeName(lat: number, lon: number): string {
  const [city, d] = nearest(CITIES, [lat, lon]);
  return d < 60 ? city[0] : `${city[0]} region`;
}
