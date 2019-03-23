import React from 'react';
import { registerComponent } from 'meteor/vulcan:core';
import { withStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import classNames from 'classnames'

const styles = (theme) => ({
  root: {
    cursor: "pointer",
    color: theme.palette.minorButton.main,
    verticalAlign: "middle",
    '& svg': {
      marginRight: theme.spacing.unit
    },
  }
})

const TitleButton = ({children, classes, className}) => {
  return <Typography component='span' variant='body2' className={classNames(classes.root, className)}>
    {children}
  </Typography>
}

registerComponent( 'TitleButton', TitleButton, withStyles(styles, {name: 'TitleButton'}))
