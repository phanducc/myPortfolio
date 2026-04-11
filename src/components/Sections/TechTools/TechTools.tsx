import { Container, Typography, Grid, Divider } from '@mui/material';
import { useContext, useEffect } from 'react';
import { ColorModeContext } from '../../../../pages/_app';
import MainTitleAnimation from '../../../gsap/MainTitleAnimation';
import { centeredStyles } from '../Perks/Perks';
import ToolCard from './ToolCard';
import gsap from 'gsap';

const TechTools = ({ iconsArray }: any) => {
    let SoftwareTools = iconsArray && iconsArray.filter((icon: any) => !icon.isBackend);
    let HardwareTools = iconsArray && iconsArray.filter((icon: any) => icon.isBackend);

    const colorMode = useContext(ColorModeContext);
    
    const isfilterMode = (item: any) => colorMode?.mode === 'light' ? false : item?.filter;

    useEffect(() => {
        MainTitleAnimation('.title1', '.title2');
        gsap.to('.secondTitle', {
            opacity: 1,
            y: 0,
            scrollTrigger: {
                trigger: '.secondTitle',
                start: 'top 70%'
            }
        });
    }, []);

    return (
        <>
            <Container maxWidth='lg' sx={{ margin: '0 auto', py: { xs: '6em' } }}>
                <Grid container>
                    <Grid item sx={centeredStyles}>
                        <Typography
                            className='title1 t25o0'
                            variant='h1'
                            sx={{ fontSize: { xs: '2.2em', sm: '2.5em', md: '3em' } }}
                            fontWeight='600'
                        >
                            Kỹ Năng & Công Nghệ
                        </Typography>
                        <Typography
                            variant='h2'
                            className='secondary title2 t25o0'
                            sx={{ pt: '1.5em', maxWidth: '570px', fontSize: { xs: '.8em', sm: '1em' } }}
                        >
                            Công cụ, ngôn ngữ lập trình và nền tảng phần mềm tôi thường sử dụng
                        </Typography>
                    </Grid>

                    <Grid item xs={12} sx={{ ...centeredStyles, flexDirection: 'row', justifyContent: { xs: "center" }, mt: '3em', flexWrap: 'wrap' }}>
                        {SoftwareTools && SoftwareTools.map((item: any) => (
                            <ToolCard
                                className='toolCard1'
                                filter={isfilterMode(item)}
                                svg={item.svg}
                                title={item.title}
                                key={item.title}
                            />
                        ))}
                    </Grid>

                    {HardwareTools && HardwareTools.length > 0 ? (
                        <>
                            <Grid item sx={centeredStyles}>
                                <Typography
                                    variant='h2'
                                    className='secondary secondTitle t25o0'
                                    sx={{ pt: '3.5em', opacity: 0, fontSize: { xs: '.8em', sm: '1em' } }}
                                >
                                    Phần Cứng & Hệ Thống Nhúng
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sx={{ ...centeredStyles, flexDirection: 'row', justifyContent: { xs: "center" }, mt: '3em', flexWrap: 'wrap' }}>
                                {HardwareTools.map((tool: any) => (
                                    <ToolCard
                                        className='toolCard2'
                                        filter={isfilterMode(tool)}
                                        svg={tool.svg}
                                        title={tool.title}
                                        key={tool.title}
                                    />
                                ))}
                            </Grid>
                        </>
                    ) : null}
                </Grid>
            </Container>
            <Divider />
        </>
    );
};

export default TechTools;