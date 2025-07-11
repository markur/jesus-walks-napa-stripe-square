
{pkgs}: {
  deps = [
    pkgs.psmisc
    pkgs.unixtools.nettools
    pkgs.texinfoInteractive
    pkgs.nodejs_20
    pkgs.nodePackages.npm
    pkgs.imagemagick
    pkgs.postgresql
  ];
}
