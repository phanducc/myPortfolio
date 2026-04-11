import { Container, Box, Grid } from '@mui/material';
import Image from 'next/image'
import Typography from '@mui/material/Typography';
import ReadMore from '../ReadMore/ReadMore';
import { ColorModeContext } from '../../../../pages/_app';
import { useContext } from 'react';
const About = () => {
    const colorMode = useContext(ColorModeContext)
    return (
    <>
        <Container
        id='about'
            maxWidth='lg'
            sx={{
            margin: '0 auto',
            py: '6em',
          
        }}>
            <Grid
                container
                sx={{
                justifyContent: {
                    sm: 'center',
                    md: 'space-between'
                }
            }}>

                <Grid item xs={12} sm={12} md={4} lg={5}>
                    <Box
                        sx={{
                        maxWidth: '400px',
                        width: '100%',
                        height: '450px',
                        margin: '0 auto',
                        boxShadow: {
                            xs: '-.5em 1.5em 0px #0092ff',
                            sm: '-1.5em 1.5em 0px #0092ff'
                        },
                        position: 'relative'
                    }}>
                        <Box
                            sx={{
                            width: '100px',
                            height: '100px',
                            zIndex: '0',
                            position: 'absolute',
                            right: {
                                xs: '-4%',
                                sm: '90%'
                            },
                            
                            bottom: {
                                xs: '-5%',
                                sm: '-10%'
                            },
                            background: 'transparent',
                            backgroundImage:colorMode.mode === 'dark' ? 'radial-gradient(white 2px, transparent 0)' : 'radial-gradient(black 2px, transparent 0)',
                            backgroundSize: '15px 13px'
                        }}></Box>
                        <Image
                            alt='Personal Image'
                            className='img1 '
                            layout='fill'
                            src={`/avatar.png`}/>
                    </Box>
                </Grid>
                <Grid item xs={12} sm={12} md={7.5} lg={7}>
                    <Box sx={{
                        pb: '.5em'
                    }}>
                        <Typography
                            variant='h1'
                            sx={{
                            fontSize: {
                                xs: '2.2em',
                                sm: '2.5em',
                                md: '3em'
                            },
                            py: '.5em',
                            pt: {
                                xs: '1.8em',
                                md:0,
                            }
                        }}
                            fontWeight='600'>
                            Tôi là Phan Văn Đức
                        </Typography>
                        <Typography
                            variant='h2'
                            sx={{
                            maxWidth: '570px',
                            fontSize: {
                                xs: '.8em',
                                sm: '1em'
                            }
                        }}>
                      Tôi là sinh viên 21 tuổi chuyên ngành Kỹ thuật Điện tử - Viễn thông tại Đại học Mở Hà Nội. Trọng tâm nghiên cứu và phát triển của tôi là các hệ thống nhúng, vi điều khiển.

                        </Typography>
                    </Box>
                    <Typography
                            variant='h2'
                            sx={{
                            maxWidth: '570px',
                            fontSize: {
                                xs: '.8em',
                                sm: '1em'
                            },
                            pb:'.5em'
                        }}>
                      Bên cạnh phần cứng, tôi cũng dành nhiều thời gian cho việc phát triển phần mềm, từ C/C++, Python cho đến xây dựng các nền tảng Web. Mục tiêu của tôi là tạo ra những sản phẩm hoàn chỉnh, kết nối mượt mà từ lõi vi mạch bên trong đến giao diện người dùng bên ngoài.

                        </Typography>
                    <ReadMore>
                    Ngoài thời gian chạy deadline đồ án và code, tôi thường giải trí bằng game hoặc đơn giản là xách xe chạy lòng vòng và tự tay bảo dưỡng chiếc xe của mình. Nếu bạn hứng thú với những dự án của tôi, đừng ngần ngại gửi một tin nhắn nhé!
                    </ReadMore>
                </Grid>
            </Grid>

        </Container>

        </>
    
    )
}

export default About
