import React from 'react';
import { Components, registerComponent } from '../../../lib/vulcan-lib';
import type { UserReactInfo } from '../../../lib/voting/namesAttachedReactions';
import classNames from 'classnames';

const styles = (theme: ThemeType): JssStyles => ({
  usersWhoReactedRoot: {
    maxWidth: 225,
    display: "inline-block",
    color: theme.palette.grey[600]
  },
  usersWhoReactedWrap: {
    whiteSpace: "unset",
  },
  userWhoAntiReacted: {
    color: theme.palette.error.main,
    opacity: .6
  },
  usersWhoReacted: {
    fontSize: 12,
  },
})

const UsersWhoReacted = ({usersWhoReacted, wrap=false, showTooltip=true, classes}:{
  usersWhoReacted: UserReactInfo[],
  wrap?: boolean,
  showTooltip?: boolean,
  classes:ClassesType,
}) => {
  const { LWTooltip } = Components;
  const usersWhoReactedWithoutQuotes = usersWhoReacted.filter(r => !r.quotes || r.quotes.length === 0)

  if (usersWhoReactedWithoutQuotes.length === 0) return null;

  const usersWhoProReacted = usersWhoReactedWithoutQuotes.filter(r=>r.reactType!=="disagreed")
  const usersWhoAntiReacted = usersWhoReactedWithoutQuotes.filter(r=>r.reactType==="disagreed")

  const tooltip = <div>
    <p>Users Who Reacted:</p>
    <ul>{usersWhoProReacted.map(r => <li key={r.userId}>{r.displayName}</li>)}</ul>
    {usersWhoAntiReacted.length > 0 && <>
      <p>Users Who Anti-reacted:</p>
      <ul>{usersWhoAntiReacted.map(r => <li key={r.userId}>{r.displayName}</li>)}</ul>
    </>}
  </div>

  const component = <div className={classes.usersWhoReactedRoot}>
      {usersWhoProReacted.length > 0 &&
        <div className={classNames(classes.usersWhoReacted, {[classes.usersWhoReactedWrap]: wrap})}>
          {usersWhoProReacted.map((userReactInfo,i) =>
            <span key={userReactInfo.userId}>
              {(i>0) && <span>{", "}</span>}
              {userReactInfo.displayName}
            </span>
          )}
        </div>
      }
      {usersWhoAntiReacted.length > 0 &&
        <div className={classNames(classes.usersWhoReacted, {[classes.usersWhoReactedWrap]: wrap})}>
          {usersWhoAntiReacted.map((userReactInfo,i) =>
            <span key={userReactInfo.userId} className={classes.userWhoAntiReacted}>
              {(i>0) && <span>{", "}</span>}
              {userReactInfo.displayName}
            </span>
          )}
        </div>
      }
  </div>

  if (showTooltip) {
    return <LWTooltip title={tooltip}>
      {component}
    </LWTooltip>
  } else {
    return component
  }
}

const UsersWhoReactedComponent = registerComponent('UsersWhoReacted', UsersWhoReacted, {styles});

declare global {
  interface ComponentTypes {
    UsersWhoReacted: typeof UsersWhoReactedComponent
  }
}

